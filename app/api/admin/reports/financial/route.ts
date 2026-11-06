export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { periodWhere, revenueByVehicle } from '@/lib/reports/where'

type Financial = {
  totals: { aggregate: { count: number; sum: { total_amount: number | string | null }; avg: { total_amount: number | string | null } } }
  confirmed: { aggregate: { count: number } }
  bookings: { total_amount: number | string; vehicle: { id: string; brand: string; model: string } | null }[]
}

export async function GET(req: NextRequest) {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const startDate = req.nextUrl.searchParams.get('startDate')
  const endDate = req.nextUrl.searchParams.get('endDate')
  const period = periodWhere(startDate, endDate)
  // Receita não conta reservas canceladas.
  const where = { ...period, status: { _neq: 'cancelled' } }
  try {
    const data = await adminGraphql<Financial>(
      `query GetFinancialReport($where: bookings_bool_exp!, $confirmed: bookings_bool_exp!) {
        totals: bookings_aggregate(where: $where) { aggregate { count sum { total_amount } avg { total_amount } } }
        confirmed: bookings_aggregate(where: $confirmed) { aggregate { count } }
        bookings(where: $where) { total_amount vehicle { id brand model } }
      }`,
      // A taxa de confirmação usa o mesmo período (antes contava todas as reservas da história).
      { where, confirmed: { ...period, status: { _eq: 'confirmed' } } },
    )
    const totalBookings = data.totals.aggregate.count
    const confirmedBookings = data.confirmed.aggregate.count
    return viewerJson(viewer, {
      totalRevenue: Number(data.totals.aggregate.sum.total_amount ?? 0),
      totalBookings,
      averageTicket: Number(data.totals.aggregate.avg.total_amount ?? 0),
      confirmedBookings,
      confirmationRate: totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : 0,
      vehiclePerformance: revenueByVehicle(data.bookings),
      period: Object.keys(period).length ? `${startDate} a ${endDate}` : 'Todos os períodos',
    })
  } catch (error) {
    console.error('[admin/reports/financial]', error)
    return viewerJson(viewer, { error: 'Erro ao gerar relatório financeiro' }, { status: 500 })
  }
}

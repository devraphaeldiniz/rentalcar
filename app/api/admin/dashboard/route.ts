export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

type Count = { aggregate: { count: number } }
type Dashboard = {
  bookings_aggregate: { aggregate: { count: number; sum: { total_amount: number | string | null } } }
  pending: Count
  vehicles_aggregate: Count
  available_vehicles: Count
  profiles_aggregate: Count
}

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<Dashboard>(`
      query GetDashboardStats {
        bookings_aggregate(where: { status: { _neq: "cancelled" } }) { aggregate { count sum { total_amount } } }
        pending: bookings_aggregate(where: { status: { _eq: "pending" } }) { aggregate { count } }
        vehicles_aggregate { aggregate { count } }
        available_vehicles: vehicles_aggregate(where: { status: { _eq: "available" } }) { aggregate { count } }
        profiles_aggregate { aggregate { count } }
      }`)
    const stats = {
      totalRevenue: Number(data.bookings_aggregate.aggregate.sum.total_amount ?? 0),
      totalBookings: data.bookings_aggregate.aggregate.count,
      totalVehicles: data.vehicles_aggregate.aggregate.count,
      totalUsers: data.profiles_aggregate.aggregate.count,
      pendingBookings: data.pending.aggregate.count,
      activeVehicles: data.available_vehicles.aggregate.count,
    }
    return viewerJson(viewer, { stats })
  } catch (error) {
    console.error('[admin/dashboard]', error)
    return viewerJson(viewer, { error: 'Erro ao buscar estatísticas' }, { status: 500 })
  }
}

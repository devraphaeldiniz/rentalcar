export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { BOOKING_STATUSES } from '@/lib/booking-status'
import { periodWhere } from '@/lib/reports/where'

export async function GET(req: NextRequest) {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const params = req.nextUrl.searchParams
  const status = params.get('status')
  const where = {
    ...periodWhere(params.get('startDate'), params.get('endDate')),
    ...(status && (BOOKING_STATUSES as readonly string[]).includes(status) ? { status: { _eq: status } } : {}),
  }
  try {
    const data = await adminGraphql<{ bookings: unknown[] }>(
      `query GetBookingsReport($where: bookings_bool_exp!) {
        bookings(where: $where, order_by: { created_at: desc }) {
          id start_date end_date total_amount status created_at
          user { email displayName }
          vehicle { brand model plate }
        }
      }`,
      { where },
    )
    return viewerJson(viewer, { bookings: data.bookings })
  } catch (error) {
    console.error('[admin/reports/bookings]', error)
    return viewerJson(viewer, { error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}

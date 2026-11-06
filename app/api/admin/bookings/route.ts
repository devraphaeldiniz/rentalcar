export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ bookings: unknown[] }>(`
      query GetBookings {
        bookings(order_by: { created_at: desc }) {
          id start_date end_date total_amount status created_at
          user { email displayName }
          vehicle { brand model plate }
        }
      }`)
    return viewerJson(viewer, { bookings: data.bookings })
  } catch (error) {
    console.error('[admin/bookings]', error)
    return viewerJson(viewer, { error: 'Erro ao buscar reservas' }, { status: 500 })
  }
}

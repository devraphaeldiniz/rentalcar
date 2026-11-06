export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'

export async function GET() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const data = await adminGraphql<{ bookings: { id: string }[]; reviews: { booking_id: string }[] }>(
      `query GetMyBookings($user_id: uuid!) {
        bookings(where: { user_id: { _eq: $user_id } }, order_by: { created_at: desc }) {
          id
          start_date
          end_date
          total_amount
          status
          created_at
          vehicle { id brand model images image_url daily_rate }
        }
        reviews(where: { user_id: { _eq: $user_id } }) { booking_id }
      }`,
      { user_id: auth.userId },
    )
    // Marca as reservas que já foram avaliadas, para esconder o botão "Avaliar".
    const reviewed = new Set((data.reviews ?? []).map((r) => r.booking_id))
    // Vistorias (retirada e devolução) das reservas. Consulta à parte: sem a migração 015, a lista continua.
    const ids = (data.bookings ?? []).map((b) => b.id)
    const insp = ids.length
      ? await adminGraphql<{ booking_inspections: { booking_id: string }[] }>(
          `query Insp($ids: [uuid!]!) {
            booking_inspections(where: { booking_id: { _in: $ids } }) { booking_id kind odometer_km fuel_eighths damages extra_charges extra_total created_at }
          }`,
          { ids },
        ).catch(() => ({ booking_inspections: [] }))
      : { booking_inspections: [] }
    const bookings = (data.bookings ?? []).map((b) => ({
      ...b,
      reviews: reviewed.has(b.id) ? [{ id: b.id }] : [],
      inspections: insp.booking_inspections.filter((i) => i.booking_id === b.id),
    }))
    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('[bookings/my]', error)
    return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
  }
}

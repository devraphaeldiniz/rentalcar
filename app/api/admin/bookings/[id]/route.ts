export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'
import { adminFromStatuses, BOOKING_STATUSES, changeBookingStatus } from '@/lib/booking-status'


export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ bookings_by_pk: unknown }>(
      `query AdminBooking($id: uuid!) {
        bookings_by_pk(id: $id) {
          id start_date end_date total_amount status payment_status payment_method mp_payment_id paid_at created_at price_lines coupon_code terms_accepted_at
          user { id email displayName phoneNumber }
          vehicle { id brand model year plate daily_rate images }
        }
      }`,
      { id: params.id },
    )
    if (!data.bookings_by_pk) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    return NextResponse.json(data.bookings_by_pk)
  } catch (error) {
    console.error('[admin/bookings/:id GET]', error)
    return NextResponse.json({ error: 'Erro ao carregar a reserva' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const { status } = await req.json()
    const { id: bookingId } = await params
    if (!BOOKING_STATUSES.includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

    // Ao cancelar, o uso do cupom volta. Reserva já cancelada não é reaberta.
    const { changed } = await changeBookingStatus(bookingId, status, adminFromStatuses(status))
    if (!changed) {
      return NextResponse.json({ error: 'Esta reserva já está cancelada ou já tem esse status.' }, { status: 409 })
    }
    return NextResponse.json({ success: true, booking: { id: bookingId, status } })
  } catch (error) {
    console.error('[admin/bookings/:id PATCH]', error)
    return NextResponse.json({ error: 'Erro ao atualizar reserva' }, { status: 500 })
  }
}

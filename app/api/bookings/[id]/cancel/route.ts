export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pickupStarted } from '@/lib/rental'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'
import { refundsApi } from '@/lib/payments/mercadopago'

// O cliente cancela a própria reserva enquanto ela ainda não começou.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }

  try {
    const { bookings_by_pk: b } = await adminGraphql<{
      bookings_by_pk: { user_id: string; status: string; start_date: string; payment_status: string | null; mp_payment_id: string | null } | null
    }>('query B($id: uuid!) { bookings_by_pk(id: $id) { user_id status start_date payment_status mp_payment_id } }', { id: params.id })

    if (!b || b.user_id !== auth.userId) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    if (!['pending', 'confirmed'].includes(b.status)) {
      return NextResponse.json({ error: 'Esta reserva não pode mais ser cancelada.' }, { status: 409 })
    }
    // Calendário de Brasília: em UTC, depois das 21h a retirada de amanhã já parecia ser hoje.
    if (pickupStarted(b.start_date)) {
      return NextResponse.json({ error: 'A retirada já começou. Fale com o atendimento para cancelar.' }, { status: 409 })
    }

    // Reserva paga online: devolve o valor integral pelo Mercado Pago antes de cancelar.
    let refunded = false
    if (b.payment_status === 'paid' && b.mp_payment_id) {
      try {
        await refundsApi().create({ payment_id: b.mp_payment_id, requestOptions: { idempotencyKey: `refund:${params.id}` } })
        refunded = true
      } catch (error) {
        console.error('[bookings/cancel] refund', error)
        return NextResponse.json({ error: 'Não foi possível estornar o pagamento agora. Tente de novo ou fale com o atendimento.' }, { status: 502 })
      }
    }

    await adminGraphql(
      `mutation C($id: uuid!, $set: bookings_set_input!) { update_bookings_by_pk(pk_columns: { id: $id }, _set: $set) { id } }`,
      { id: params.id, set: refunded ? { status: 'cancelled', payment_status: 'refunded' } : { status: 'cancelled' } },
    )
    await createAuditLog({
      userId: auth.userId,
      action: 'booking.cancelled',
      resource: 'booking',
      resourceId: params.id,
      ipAddress: await getClientIP(),
      userAgent: await getUserAgent(),
      metadata: { refunded },
    })
    return NextResponse.json({ success: true, refunded })
  } catch (error) {
    console.error('[bookings/cancel]', error)
    return NextResponse.json({ error: 'Erro ao cancelar a reserva' }, { status: 500 })
  }
}

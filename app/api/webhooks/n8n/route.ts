import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql } from '@/lib/auth/authorization'

// Webhook usado pelo n8n para confirmar reservas e pagamentos.
// Antes, um segredo vazio no .env combinava com um cabeçalho vazio e
// qualquer pessoa conseguia marcar reservas como pagas.

const MIN_SECRET_LENGTH = 32

const payload = z.discriminatedUnion('event', [
  z.object({ event: z.literal('booking.confirmed'), data: z.object({ booking_id: z.string().uuid() }) }),
  z.object({ event: z.literal('payment.received'), data: z.object({ booking_id: z.string().uuid() }) }),
])

function sameSecret(received: string, expected: string) {
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  // Comparação em tempo constante: não revela quantos caracteres acertaram.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const expected = process.env.N8N_WEBHOOK_SECRET ?? ''
  if (expected.length < MIN_SECRET_LENGTH) {
    // Sem segredo forte configurado, o webhook fica desligado.
    return NextResponse.json({ error: 'Webhook desativado' }, { status: 503 })
  }

  const received = req.headers.get('x-webhook-secret') ?? ''
  if (!sameSecret(received, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = payload.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
  const { event, data } = parsed.data

  try {
    const set = event === 'booking.confirmed' ? { status: 'confirmed' } : { payment_status: 'paid' }
    // Só altera reservas ativas; reserva cancelada não volta a valer pelo webhook.
    const result = await adminGraphql<{ update_bookings: { affected_rows: number } }>(
      `mutation UpdateBooking($id: uuid!, $set: bookings_set_input!) {
        update_bookings(where: { id: { _eq: $id }, status: { _in: ["pending", "confirmed", "active"] } }, _set: $set) { affected_rows }
      }`,
      { id: data.booking_id, set },
    )
    if (!result.update_bookings.affected_rows) return NextResponse.json({ error: 'Reserva não encontrada ou encerrada' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhook/n8n]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

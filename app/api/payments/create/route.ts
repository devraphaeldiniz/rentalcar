export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireUser } from '@/lib/auth/authorization'
import { PaymentConfigError, buildPaymentBody, paymentsApi, syncPayment, trustedAmount } from '@/lib/payments/mercadopago'

// Recebe o que o Payment Brick enviou e cria o pagamento no Mercado Pago (POST /v1/payments).
// O valor cobrado é sempre o total gravado na reserva, nunca o que veio do navegador.

const input = z.object({
  booking_id: z.string().uuid(),
  // Uma chave por tentativa: repetir a mesma tentativa não gera cobrança dupla.
  idempotency_key: z.string().uuid(),
  formData: z.object({
    token: z.string().max(200).optional(),
    issuer_id: z.union([z.string().max(20), z.number()]).optional(),
    payment_method_id: z.string().min(1).max(40),
    installments: z.union([z.number(), z.string().max(3)]).optional(),
    payer: z
      .object({
        email: z.string().email().max(200).optional(),
        first_name: z.string().max(100).optional(),
        last_name: z.string().max(100).optional(),
        identification: z.object({ type: z.string().max(20).optional(), number: z.string().max(30).optional() }).optional(),
        address: z
          .object({
            zip_code: z.string().max(12).optional(),
            federal_unit: z.string().max(4).optional(),
            city: z.string().max(100).optional(),
            neighborhood: z.string().max(100).optional(),
            street_name: z.string().max(200).optional(),
            street_number: z.union([z.string().max(20), z.number()]).optional(),
          })
          .optional(),
      })
      .optional(),
  }).passthrough(),
})

const MAX_ATTEMPTS = 8
const RETRY_WINDOW_MS = 15 * 60 * 1000

type Booking = {
  id: string
  user_id: string
  status: string
  payment_status: string | null
  payment_method: string
  total_amount: number
  vehicle: { brand: string; model: string } | null
}

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados de pagamento inválidos' }, { status: 400 })
  const { booking_id, idempotency_key, formData } = parsed.data

  try {
    const { bookings_by_pk: booking, recent } = await adminGraphql<{ bookings_by_pk: Booking | null; recent: { aggregate: { count: number } } }>(
      `query B($id: uuid!, $since: timestamptz!) {
        bookings_by_pk(id: $id) { id user_id status payment_status payment_method total_amount vehicle { brand model } }
        recent: payments_aggregate(where: { booking_id: { _eq: $id }, created_at: { _gte: $since } }) { aggregate { count } }
      }`,
      { id: booking_id, since: new Date(Date.now() - RETRY_WINDOW_MS).toISOString() },
    )
    // Só o dono paga a própria reserva.
    if (!booking || booking.user_id !== auth.userId) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    // Freio contra teste de cartões em massa na mesma reserva.
    if (recent.aggregate.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Muitas tentativas de pagamento. Aguarde alguns minutos.' }, { status: 429 })
    }
    if (booking.payment_status === 'paid') return NextResponse.json({ error: 'Esta reserva já está paga.' }, { status: 409 })
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return NextResponse.json({ error: 'Esta reserva não aceita mais pagamento.' }, { status: 409 })
    }

    // Compra confiável: lida do banco, com o total calculado no servidor quando a reserva foi criada.
    const trustedPurchase = {
      id: booking.id,
      total_amount: booking.total_amount,
      vehicleName: booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : '',
    }
    if (!Number.isFinite(Number(trustedPurchase.total_amount)) || !Number.isFinite(trustedAmount(trustedPurchase))) throw new Error('valor inválido')
    const body = buildPaymentBody(trustedPurchase, formData, auth.email)

    const payment = await paymentsApi().create({
      body,
      requestOptions: { idempotencyKey: `${booking.id}:${idempotency_key}` },
    })

    // Grava já o resultado; o webhook depois confirma (ou atualiza um Pix pago mais tarde).
    await syncPayment(payment).catch((error) => console.error('[payments/create] sync', error))

    // A reserva passa a ser "pagar online" assim que existe uma tentativa.
    if (booking.payment_method !== 'online') {
      await adminGraphql(
        'mutation M($id: uuid!) { update_bookings_by_pk(pk_columns: { id: $id }, _set: { payment_method: "online" }) { id } }',
        { id: booking.id },
      ).catch(() => {})
    }

    return NextResponse.json({
      paymentId: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
    })
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      return NextResponse.json({ error: 'Pagamento online indisponível no momento.' }, { status: 503 })
    }
    // Erros da API do Mercado Pago chegam com message/cause; nunca devolvemos o corpo cru ao cliente.
    const detail = error as { message?: string; status?: number; cause?: unknown }
    console.error('[payments/create]', detail?.status, detail?.message, JSON.stringify(detail?.cause ?? ''))
    // Em desenvolvimento, devolve o motivo do Mercado Pago para facilitar o diagnóstico.
    const devDetail = process.env.NODE_ENV !== 'production' ? ` [${detail?.status ?? ''} ${detail?.message ?? ''} ${JSON.stringify(detail?.cause ?? '')}]` : ''
    return NextResponse.json(
      { error: `Não foi possível processar o pagamento. Confira os dados ou tente outro meio de pagamento.${devDetail}` },
      { status: 502 },
    )
  }
}

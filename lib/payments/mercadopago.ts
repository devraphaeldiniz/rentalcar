// Integração com o Mercado Pago (Payments API, usada pelo Payment Brick).
// Só de servidor: usa MP_ACCESS_TOKEN, que nunca pode chegar ao navegador.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { MercadoPagoConfig, Payment, PaymentRefund } from 'mercadopago'
import type { PaymentCreateRequest } from 'mercadopago/dist/clients/payment/create/types'
import type { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes'
import { adminGraphql } from '@/lib/auth/authorization'
import { SITE_URL } from '@/lib/site'

export class PaymentConfigError extends Error {}

function client() {
  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) throw new PaymentConfigError('MP_ACCESS_TOKEN não configurado')
  return new MercadoPagoConfig({ accessToken, options: { timeout: 10000 } })
}

export const paymentsApi = () => new Payment(client())
export const refundsApi = () => new PaymentRefund(client())

/** Pagamento online só fica disponível com as duas chaves configuradas. */
export function onlinePaymentEnabled() {
  return Boolean(process.env.MP_ACCESS_TOKEN && process.env.NEXT_PUBLIC_MP_PUBLIC_KEY)
}

/** Dados que o Payment Brick devolve no onSubmit (snake_case, como na API). */
export type BrickFormData = {
  token?: string
  issuer_id?: string | number
  payment_method_id: string
  installments?: number | string
  transaction_amount?: number
  payer?: {
    email?: string
    first_name?: string
    last_name?: string
    identification?: { type?: string; number?: string }
    address?: {
      zip_code?: string
      federal_unit?: string
      city?: string
      neighborhood?: string
      street_name?: string
      street_number?: string | number
    }
  }
}

export type TrustedBooking = { id: string; total_amount: number | string; vehicleName: string }

/** Valor a cobrar, sempre a partir da reserva gravada no banco (nunca do navegador). */
export function trustedAmount(booking: TrustedBooking) {
  const amount = Math.round(Number(booking.total_amount) * 100) / 100
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valor da reserva inválido')
  return amount
}

const MAX_INSTALLMENTS = 12

/**
 * URL do webhook enviada em cada pagamento (notification_url), sem cadastro manual.
 * Na Vercel o SITE_URL vem do domínio de produção; em localhost fica de fora,
 * porque o Mercado Pago não alcança a máquina local e recusa URLs não públicas.
 * source_news=webhooks pede o formato Webhooks (assinado com x-signature).
 */
export function webhookUrl(base: string = SITE_URL) {
  try {
    const url = new URL(base)
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) return undefined
    return `${url.origin}/api/webhooks/mercadopago?source_news=webhooks`
  } catch {
    return undefined
  }
}

/**
 * Monta o corpo do POST /v1/payments a partir do que o Brick enviou.
 * O valor, a referência e a descrição vêm da reserva; do navegador só entram
 * o meio de pagamento escolhido, o token do cartão e os dados do pagador.
 */
export function buildPaymentBody(booking: TrustedBooking, data: BrickFormData, fallbackEmail: string | null): PaymentCreateRequest {
  const transaction_amount = trustedAmount(booking)
  const payer = data.payer ?? {}
  const email = payer.email || fallbackEmail
  if (!email) throw new Error('E-mail do pagador ausente')

  const body: PaymentCreateRequest = {
    transaction_amount,
    description: `Reserva AstaCar ${booking.vehicleName}`.slice(0, 250),
    external_reference: booking.id,
    statement_descriptor: 'ASTACAR',
    payment_method_id: data.payment_method_id,
    metadata: { booking_id: booking.id },
    ...(webhookUrl() ? { notification_url: webhookUrl() } : {}),
    payer: {
      email,
      ...(payer.first_name ? { first_name: payer.first_name } : {}),
      ...(payer.last_name ? { last_name: payer.last_name } : {}),
      ...(payer.identification?.type && payer.identification?.number
        ? { identification: { type: payer.identification.type, number: String(payer.identification.number) } }
        : {}),
      ...(payer.address?.zip_code
        ? {
            address: {
              zip_code: payer.address.zip_code,
              federal_unit: payer.address.federal_unit,
              city: payer.address.city,
              neighborhood: payer.address.neighborhood,
              street_name: payer.address.street_name,
              street_number: payer.address.street_number !== undefined ? String(payer.address.street_number) : undefined,
            },
          }
        : {}),
    } as PaymentCreateRequest['payer'],
  }

  // Cartão: token gerado pelo Brick (nunca guardado), parcelas e emissor.
  if (data.token) {
    const installments = Math.trunc(Number(data.installments ?? 1))
    body.token = data.token
    body.installments = installments >= 1 && installments <= MAX_INSTALLMENTS ? installments : 1
    if (data.issuer_id !== undefined && data.issuer_id !== null && data.issuer_id !== '') {
      body.issuer_id = Number(data.issuer_id)
    }
  }
  return body
}

/** Valida o cabeçalho x-signature do webhook (HMAC-SHA256 com o segredo do painel). */
export function verifyWebhookSignature(input: {
  signature: string | null
  requestId: string | null
  dataId: string | null
  secret: string | undefined
}) {
  const { signature, requestId, dataId, secret } = input
  if (!secret || !signature || !requestId || !dataId) return false
  const parts = Object.fromEntries(
    signature.split(',').map((p) => {
      const [k, ...v] = p.split('=')
      return [k.trim(), v.join('=').trim()]
    }),
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false
  // IDs alfanuméricos chegam em minúsculas no manifesto assinado.
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(v1)
  return a.length === b.length && timingSafeEqual(a, b)
}

type BookingForSync = {
  id: string
  status: string
  payment_status: string | null
  total_amount: number | string
}

/**
 * Grava o estado de um pagamento do Mercado Pago na reserva correspondente.
 * Idempotente: o mesmo pagamento pode chegar pela criação e por vários webhooks.
 */
export async function syncPayment(payment: PaymentResponse) {
  const bookingId = payment.external_reference
  const mpId = payment.id ? String(payment.id) : null
  if (!bookingId || !mpId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return { synced: false as const, reason: 'sem referência' }

  const { bookings_by_pk: booking } = await adminGraphql<{ bookings_by_pk: BookingForSync | null }>(
    'query B($id: uuid!) { bookings_by_pk(id: $id) { id status payment_status total_amount } }',
    { id: bookingId },
  )
  if (!booking) return { synced: false as const, reason: 'reserva não encontrada' }

  const amount = Number(payment.transaction_amount ?? 0)
  await adminGraphql(
    `mutation P($object: payments_insert_input!) {
      insert_payments_one(object: $object, on_conflict: { constraint: payments_mp_payment_id_key, update_columns: [status, status_detail, payment_method_id, payment_type_id, amount, updated_at] }) { id }
    }`,
    {
      object: {
        booking_id: booking.id,
        mp_payment_id: mpId,
        status: payment.status ?? 'unknown',
        status_detail: payment.status_detail ?? null,
        payment_method_id: payment.payment_method_id ?? null,
        payment_type_id: payment.payment_type_id ?? null,
        amount,
        updated_at: new Date().toISOString(),
      },
    },
  )

  const set: Record<string, unknown> = {}
  if (payment.status === 'approved') {
    // Só marca como pago se o valor e a moeda batem com a reserva.
    const expected = Math.round(Number(booking.total_amount) * 100)
    if (Math.round(amount * 100) !== expected || payment.currency_id !== 'BRL') {
      console.error('[mercadopago] valor divergente', { bookingId, mpId, amount, expected: expected / 100 })
      return { synced: false as const, reason: 'valor divergente' }
    }
    if (booking.payment_status !== 'paid' && booking.payment_status !== 'refunded') {
      set.payment_status = 'paid'
      set.mp_payment_id = mpId
      set.paid_at = payment.date_approved ?? new Date().toISOString()
      if (booking.status === 'pending') set.status = 'confirmed'
    }
  } else if ((payment.status === 'refunded' || payment.status === 'charged_back') && booking.payment_status === 'paid') {
    set.payment_status = 'refunded'
  }

  if (Object.keys(set).length) {
    await adminGraphql(
      'mutation U($id: uuid!, $set: bookings_set_input!) { update_bookings_by_pk(pk_columns: { id: $id }, _set: $set) { id } }',
      { id: booking.id, set },
    )
  }
  return { synced: true as const, status: payment.status }
}

import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { buildPaymentBody, trustedAmount, verifyWebhookSignature, webhookUrl } from '@/lib/payments/mercadopago'

const booking = { id: '123e4567-e89b-12d3-a456-426614174000', total_amount: '450.50', vehicleName: 'Fiat Pulse' }

describe('buildPaymentBody (Payment Brick → /v1/payments)', () => {
  it('cobra o total da reserva, mesmo que o navegador mande outro valor', () => {
    const body = buildPaymentBody(booking, { payment_method_id: 'pix', transaction_amount: 1, payer: { email: 'a@b.com' } }, null)
    expect(body.transaction_amount).toBe(450.5)
    expect(body.external_reference).toBe(booking.id)
    expect(body.token).toBeUndefined()
  })

  it('cartão: mapeia token, parcelas e emissor', () => {
    const body = buildPaymentBody(
      booking,
      { token: 'tok', issuer_id: '24', installments: 3, payment_method_id: 'master', payer: { email: 'a@b.com', identification: { type: 'CPF', number: '12345678909' } } },
      null,
    )
    expect(body).toMatchObject({ token: 'tok', installments: 3, issuer_id: 24, payment_method_id: 'master' })
    expect(body.payer?.identification).toEqual({ type: 'CPF', number: '12345678909' })
  })

  it('limita parcelas inválidas a 1x', () => {
    expect(buildPaymentBody(booking, { token: 't', installments: 99, payment_method_id: 'visa' }, 'x@y.com').installments).toBe(1)
  })

  it('usa o e-mail da conta quando o Brick não envia', () => {
    expect(buildPaymentBody(booking, { payment_method_id: 'pix' }, 'conta@astacar.com').payer?.email).toBe('conta@astacar.com')
  })

  it('recusa reserva com valor inválido', () => {
    expect(() => trustedAmount({ ...booking, total_amount: 0 })).toThrow()
    expect(() => trustedAmount({ ...booking, total_amount: 'abc' })).toThrow()
  })
})

describe('verifyWebhookSignature (x-signature)', () => {
  const secret = 'segredo-de-teste'
  const sign = (id: string, requestId: string, ts: string) =>
    createHmac('sha256', secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex')

  it('aceita assinatura correta', () => {
    const v1 = sign('123456', 'req-1', '1700000000')
    expect(verifyWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456', secret })).toBe(true)
  })

  it('recusa assinatura de outro pagamento, sem segredo ou sem cabeçalhos', () => {
    const v1 = sign('123456', 'req-1', '1700000000')
    expect(verifyWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '999', secret })).toBe(false)
    expect(verifyWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456', secret: undefined })).toBe(false)
    expect(verifyWebhookSignature({ signature: null, requestId: 'req-1', dataId: '123456', secret })).toBe(false)
  })
})

describe('webhookUrl (notification_url automática)', () => {
  it('usa o domínio público em HTTPS', () => {
    expect(webhookUrl('https://rentalcar.vercel.app')).toBe('https://rentalcar.vercel.app/api/webhooks/mercadopago?source_news=webhooks')
  })
  it('fica de fora em localhost ou HTTP', () => {
    expect(webhookUrl('http://localhost:3000')).toBeUndefined()
    expect(webhookUrl('http://exemplo.com')).toBeUndefined()
  })
})

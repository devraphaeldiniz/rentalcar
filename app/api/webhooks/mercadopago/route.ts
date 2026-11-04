export const dynamic = 'force-dynamic'

import { after, type NextRequest, NextResponse } from 'next/server'
import { paymentsApi, syncPayment, verifyWebhookSignature } from '@/lib/payments/mercadopago'

// Notificações do Mercado Pago (tópico "payment").
// 1) valida a assinatura x-signature antes de tudo;
// 2) responde 200 na hora (o MP reenvia por até 24h se não receber);
// 3) busca o pagamento na API com o nosso token e só então atualiza a reserva.
// O corpo da notificação nunca é usado como fonte do status: só o ID.

export async function POST(req: NextRequest) {
  const secret = process.env.MP_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Webhook desativado' }, { status: 503 })

  const body = (await req.json().catch(() => null)) as { type?: string; action?: string; data?: { id?: string | number } } | null
  const dataId = req.nextUrl.searchParams.get('data.id') ?? (body?.data?.id !== undefined ? String(body.data.id) : null)
  const type = req.nextUrl.searchParams.get('type') ?? body?.type ?? null

  const valid = verifyWebhookSignature({
    signature: req.headers.get('x-signature'),
    requestId: req.headers.get('x-request-id'),
    dataId,
    secret,
  })
  if (!valid) return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 })

  if (type === 'payment' && dataId && /^\d{1,20}$/.test(dataId)) {
    after(async () => {
      try {
        const payment = await paymentsApi().get({ id: dataId })
        const result = await syncPayment(payment)
        console.log(`[webhook/mercadopago] payment=${dataId} status=${payment.status} synced=${result.synced}`)
      } catch (error) {
        console.error(`[webhook/mercadopago] payment=${dataId}`, error)
      }
    })
  }

  return NextResponse.json({ received: true })
}

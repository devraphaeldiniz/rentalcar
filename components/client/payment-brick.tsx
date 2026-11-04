'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { initMercadoPago, Payment, StatusScreen } from '@mercadopago/sdk-react'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/contexts/theme-context'
import { formatBRL } from '@/lib/rental'

// Chave pública vem da configuração pública do Next (NEXT_PUBLIC_*): pode ir para o navegador.
const PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY
let initialized = false
function ensureInit() {
  if (!initialized && PUBLIC_KEY) {
    initMercadoPago(PUBLIC_KEY, { locale: 'pt-BR' })
    initialized = true
  }
}

type Phase = 'initializing' | 'ready' | 'processing' | 'result' | 'error'

type Props = {
  bookingId: string
  /** Total gravado na reserva (o servidor cobra exatamente este valor). */
  amount: number
  payerEmail: string | null
  /** Pix ou boleto já gerado e ainda aguardando: mostra o status em vez de um novo formulário. */
  pendingPaymentId?: string | null
}

export function PaymentBrick({ bookingId, amount, payerEmail, pendingPaymentId }: Props) {
  ensureInit()
  const { theme } = useTheme()
  const [phase, setPhase] = useState<Phase>(pendingPaymentId ? 'result' : 'initializing')
  const [paymentId, setPaymentId] = useState<string | null>(pendingPaymentId ?? null)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(pendingPaymentId ? 'pending' : null)
  const [errorMessage, setErrorMessage] = useState('')
  // Nova chave a cada tentativa; reenvios da mesma tentativa reaproveitam a chave (sem cobrança dupla).
  const attemptKey = useRef<string>(crypto.randomUUID())
  const [brickKey, setBrickKey] = useState(0)

  const initialization = useMemo(
    () => ({ amount, ...(payerEmail ? { payer: { email: payerEmail } } : {}) }),
    [amount, payerEmail],
  )
  const customization = useMemo(
    () => ({
      paymentMethods: { creditCard: 'all' as const, debitCard: 'all' as const, bankTransfer: 'all' as const, ticket: 'all' as const, maxInstallments: 12 },
      visual: { style: { theme: theme === 'dark' ? ('dark' as const) : ('default' as const) } },
    }),
    [theme],
  )

  // O Brick espera uma Promise: ela só resolve depois que o servidor responde.
  const onSubmit = useCallback(
    async ({ formData }: { formData: unknown }) => {
      setPhase('processing')
      setErrorMessage('')
      try {
        const response = await fetch('/api/payments/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ booking_id: bookingId, idempotency_key: attemptKey.current, formData }),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.paymentId) {
          throw new Error(result.error || 'Não foi possível processar o pagamento. Tente novamente.')
        }
        setPaymentId(String(result.paymentId))
        setPaymentStatus(result.status ?? null)
        setPhase('result')
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Sem conexão com o servidor. Tente novamente.')
        setPhase('error')
        attemptKey.current = crypto.randomUUID()
        throw error
      }
    },
    [bookingId],
  )

  const retry = () => {
    attemptKey.current = crypto.randomUUID()
    setPaymentId(null)
    setPaymentStatus(null)
    setErrorMessage('')
    setPhase('initializing')
    setBrickKey((k) => k + 1)
  }

  if (!PUBLIC_KEY) {
    return (
      <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
        Pagamento online indisponível: a chave pública do Mercado Pago não foi configurada (NEXT_PUBLIC_MP_PUBLIC_KEY).
        Você ainda pode pagar na retirada.
      </p>
    )
  }

  return (
    <div data-mp-bricks-page="payment" className="grid gap-4">
      <p className="flex items-baseline justify-between rounded-xl border bg-muted/40 px-4 py-3">
        <span className="font-medium">Total a pagar</span>
        <span className="tabular text-2xl font-black text-electric">{formatBRL(amount)}</span>
      </p>

      {phase === 'initializing' && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando formas de pagamento...
        </p>
      )}
      {phase === 'processing' && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Processando seu pagamento...
        </p>
      )}
      {phase === 'error' && (
        <div role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-semibold">Não foi possível processar o pagamento: {errorMessage}</p>
          <p className="mt-1">Confira os dados e tente novamente, ou escolha outro meio de pagamento. Em teste, use o nome do titular <strong>APRO</strong> para aprovar ou <strong>OTHE</strong> para recusar.</p>
        </div>
      )}

      {phase === 'result' && paymentId ? (
        <>
          {paymentStatus === 'approved' && (
            <div className="flex items-start gap-3 rounded-xl bg-success/10 p-4 text-sm text-success">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Pagamento aprovado! Sua reserva está confirmada.</p>
                <p>Código do pagamento: {paymentId}</p>
              </div>
            </div>
          )}
          <StatusScreen initialization={{ paymentId }} customization={{ visual: customization.visual }} />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="brand"><Link href={`/bookings/${bookingId}/confirmation`}>Ver minha reserva</Link></Button>
            {paymentStatus !== 'approved' && (
              <Button type="button" variant="outline" onClick={retry}>
                <RotateCcw className="h-4 w-4" /> Pagar de outro jeito
              </Button>
            )}
          </div>
        </>
      ) : (
        <Payment
          key={brickKey}
          initialization={initialization}
          customization={customization}
          locale="pt-BR"
          onReady={() => setPhase((p) => (p === 'initializing' ? 'ready' : p))}
          onError={(error) => {
            console.error('[payment-brick]', error)
            setErrorMessage('O formulário de pagamento não carregou. Desative bloqueadores de anúncio e recarregue a página.')
            setPhase('error')
          }}
          onSubmit={onSubmit}
        />
      )}
    </div>
  )
}

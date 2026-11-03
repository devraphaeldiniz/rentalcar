'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/useAuth'
import { dateInputClass } from '@/components/client/reserve-box'
import { CheckoutFeedback } from '@/components/client/checkout-feedback'
import { CheckoutExtras } from '@/components/client/checkout-extras'
import { computeQuote, defaultProtection, type Extra, type Quote } from '@/lib/pricing'
import { POLICIES, REQUIREMENTS } from '@/lib/policies'
import { track } from '@/lib/analytics/client'
import {
  addDaysIso,
  CATEGORY_LABELS,
  formatBRL,
  formatShortDate,
  isIsoDate,
  MAX_RENTAL_DAYS,
  pluralDays,
  rentalDays,
  todayIso,
} from '@/lib/rental'

type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  category: string
  daily_rate: number
  status: string
  images: string[] | null
  image_url: string | null
}

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>()
  const search = useSearchParams()
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const today = todayIso()
  const qsStart = search.get('retirada')
  const qsEnd = search.get('devolucao')
  const [start, setStart] = useState(isIsoDate(qsStart) && qsStart >= today ? qsStart : addDaysIso(today, 1))
  const [end, setEnd] = useState(isIsoDate(qsEnd) && qsEnd > start ? qsEnd : addDaysIso(start, 3))

  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Trava síncrona: o estado do React só atualiza no próximo render, e um clique duplo enviaria dois pedidos.
  const sending = useRef(false)
  const [extras, setExtras] = useState<Extra[]>([])
  const [protection, setProtection] = useState('')
  const [addons, setAddons] = useState<string[]>([])
  const [acceptTerms, setAcceptTerms] = useState(false)

  useEffect(() => {
    fetch('/api/extras')
      .then((r) => (r.ok ? r.json() : { extras: [] }))
      .then((d: { extras: Extra[] }) => {
        setExtras(d.extras ?? [])
        setProtection(defaultProtection(d.extras ?? [])?.code ?? '')
      })
      .catch(() => {})
  }, [])

  // Sem login, volta para cá depois de entrar, com as mesmas datas.
  useEffect(() => {
    if (authLoading || isAuthenticated) return
    const back = `/vehicles/${id}/checkout?retirada=${start}&devolucao=${end}`
    router.replace(`/auth/signin?redirect=${encodeURIComponent(back)}`)
  }, [authLoading, isAuthenticated, id, start, end, router])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/vehicles/${id}`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setVehicle(data) })
      .catch(() => { if (!cancelled) setVehicle(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const days = rentalDays(start, end)
  const validPeriod = start >= today && days >= 1 && days <= MAX_RENTAL_DAYS
  const rate = Number(vehicle?.daily_rate ?? 0)

  let quote: Quote | null = null
  if (vehicle && validPeriod) {
    try {
      quote = computeQuote({ dailyRate: rate, days, extras, protectionCode: protection || null, addonCodes: addons })
    } catch {
      quote = null
    }
  }
  const toggleAddon = (code: string) => setAddons((list) => (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]))

  // Funil: marca uma vez que a pessoa chegou à revisão da reserva.
  const startTracked = useRef(false)
  useEffect(() => {
    if (startTracked.current || !vehicle || !isAuthenticated) return
    startTracked.current = true
    track('start_checkout', { vehicleId: vehicle.id, meta: { days, base: Number(vehicle.daily_rate) * days, category: vehicle.category } })
  }, [vehicle, isAuthenticated, days])

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validPeriod) return setError('Escolha um período válido: a devolução precisa ser depois da retirada.')
    if (!acceptTerms) return setError('Leia e aceite os termos da locação para confirmar.')
    if (sending.current) return
    sending.current = true
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vehicle_id: id, start_date: start, end_date: end, protection: protection || undefined, addons, accept_terms: acceptTerms }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || 'Não foi possível confirmar a reserva. Tente novamente.')
        sending.current = false
        setSubmitting(false)
        return
      }
      // Sucesso: a trava continua ligada até a página de confirmação abrir.
      router.push(`/bookings/${result.booking.id}/confirmation`)
      return
    } catch {
      setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.')
    }
    sending.current = false
    setSubmitting(false)
  }

  if (loading || authLoading || !isAuthenticated) {
    return (
      <main className="container flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-electric" aria-label="Carregando" />
      </main>
    )
  }

  if (!vehicle) {
    return (
      <main className="container py-16">
        <h1 className="text-2xl font-bold">Carro não encontrado</h1>
        <Link href="/" className="mt-3 inline-block text-electric hover:underline">Ver carros disponíveis</Link>
      </main>
    )
  }

  const image = vehicle.images?.[0] || vehicle.image_url
  const name = `${vehicle.brand} ${vehicle.model}`

  return (
    <main className="container py-8">
      <Link href={`/vehicles/${id}?retirada=${start}&devolucao=${end}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para o carro
      </Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-electric">Última etapa</p>
      <h1 className="mt-1 text-3xl font-extrabold">Revise e confirme</h1>

      <form onSubmit={confirm} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-8 content-start">
          <section className="flex gap-4 rounded-2xl border bg-card p-4">
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
              {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-electric">{CATEGORY_LABELS[vehicle.category] ?? vehicle.category} · {vehicle.year}</p>
              <p className="text-xl font-bold">{name}</p>
              <p className="text-sm text-muted-foreground">{formatBRL(rate)} por diária</p>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-bold">Período</h2>
            <div className="mt-3 grid max-w-md grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="co-retirada">Retirada</Label>
                <input id="co-retirada" type="date" min={today} value={start} className={dateInputClass}
                  onChange={(e) => { setStart(e.target.value); if (e.target.value && end <= e.target.value) setEnd(addDaysIso(e.target.value, 1)) }} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="co-devolucao">Devolução</Label>
                <input id="co-devolucao" type="date" min={addDaysIso(start || today, 1)} value={end} className={dateInputClass}
                  onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-bold">Quem vai retirar</h2>
            <dl className="mt-3 grid max-w-md gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Nome</dt><dd className="font-medium">{user?.displayName || 'Não informado'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">E-mail</dt><dd className="font-medium">{user?.email}</dd></div>
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">
              Leve documento com foto e CNH válida na retirada.{' '}
              <Link href="/profile" className="text-electric hover:underline">Atualizar meus dados</Link>
            </p>
          </section>

          <CheckoutExtras
            extras={extras}
            days={validPeriod ? days : 1}
            protection={protection}
            addons={addons}
            onProtection={setProtection}
            onToggleAddon={toggleAddon}
          />

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="text-lg font-bold">Antes de confirmar</h2>
            <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {[...REQUIREMENTS, ...POLICIES.slice(0, 3)].map((r) => (
                <li key={r.title}>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-muted-foreground">{r.text}</p>
                </li>
              ))}
            </ul>
            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--electric))]"
              />
              <span>
                Li e aceito os{' '}
                <Link href="/termos" target="_blank" className="font-semibold text-electric hover:underline">termos da locação</Link>{' '}
                e os requisitos acima.
              </span>
            </label>
          </section>

          <CheckoutFeedback vehicleId={vehicle.id} days={validPeriod ? days : 0} total={quote?.total ?? 0} />
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start rounded-2xl border bg-card p-6 shadow-xl shadow-black/10">
          <h2 className="text-lg font-bold">Resumo</h2>
          {validPeriod && quote ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{formatShortDate(start)} a {formatShortDate(end)} · {pluralDays(days)}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {quote.lines.map((l) => (
                  <li key={l.code} className="flex justify-between gap-3">
                    <span>
                      <span className={l.kind === 'discount' ? 'text-success' : ''}>{l.label}</span>
                      <span className="block text-xs text-muted-foreground">{l.detail}</span>
                    </span>
                    <span className={`tabular shrink-0 ${l.kind === 'discount' ? 'text-success' : ''}`}>
                      {l.amount === 0 ? 'Incluída' : formatBRL(l.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-end justify-between border-t pt-4">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold"><span className="tabular font-black text-electric">{formatBRL(quote.total)}</span></span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Escolha datas válidas para ver o total.</p>
          )}

          {error && <p role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <Button type="submit" variant="brand" size="lg" className="mt-5 w-full" disabled={!validPeriod || !quote || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Confirmando...' : 'Confirmar reserva'}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">Pagamento na retirada. Você pode acompanhar a reserva em Minhas reservas.</p>
        </aside>
      </form>
    </main>
  )
}

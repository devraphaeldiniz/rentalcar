'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/hooks/useAuth'
import { dateInputClass } from '@/components/client/reserve-box'
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

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validPeriod) return setError('Escolha um período válido: a devolução precisa ser depois da retirada.')
    if (sending.current) return
    sending.current = true
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ vehicle_id: id, start_date: start, end_date: end }),
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </main>
    )
  }

  if (!vehicle) {
    return (
      <main className="container py-16">
        <h1 className="text-2xl font-bold">Carro não encontrado</h1>
        <Link href="/" className="mt-3 inline-block text-primary hover:underline">Ver carros disponíveis</Link>
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
      <h1 className="mt-4 text-3xl font-bold">Revise e confirme</h1>

      <form onSubmit={confirm} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-8 content-start">
          <section className="flex gap-4 rounded-lg border p-4">
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[vehicle.category] ?? vehicle.category} | {vehicle.year}</p>
              <p className="text-xl font-bold">{name}</p>
              <p className="text-sm text-muted-foreground">{formatBRL(rate)} por diária</p>
            </div>
          </section>

          <section>
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

          <section>
            <h2 className="text-lg font-bold">Quem vai retirar</h2>
            <dl className="mt-3 grid max-w-md gap-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Nome</dt><dd className="font-medium">{user?.displayName || 'Não informado'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted-foreground">E-mail</dt><dd className="font-medium">{user?.email}</dd></div>
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">
              Leve documento com foto e CNH válida na retirada.{' '}
              <Link href="/profile" className="text-primary hover:underline">Atualizar meus dados</Link>
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start rounded-lg border bg-card p-5">
          <h2 className="text-lg font-bold">Resumo</h2>
          {validPeriod ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">{formatShortDate(start)} a {formatShortDate(end)}</p>
              <div className="mt-4 flex justify-between text-sm">
                <span>{pluralDays(days)} x {formatBRL(rate)}</span>
                <span>{formatBRL(rate * days)}</span>
              </div>
              <div className="mt-4 flex items-end justify-between border-t pt-4">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold"><span className="bg-lane/30 px-1 -mx-1 rounded-sm">{formatBRL(rate * days)}</span></span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Escolha datas válidas para ver o total.</p>
          )}

          {error && <p role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          <Button type="submit" size="lg" className="mt-5 w-full" disabled={!validPeriod || submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Confirmando...' : 'Confirmar reserva'}
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">Pagamento na retirada. Você pode acompanhar a reserva em Minhas reservas.</p>
        </aside>
      </form>
    </main>
  )
}

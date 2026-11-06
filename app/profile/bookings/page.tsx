'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReviewForm } from '@/components/reviews/review-form'
import { compareInspections, fuelLabel, type Inspection } from '@/lib/inspections'
import { useAuth } from '@/lib/hooks/useAuth'
import { BOOKING_STATUS, formatBRL, formatLongDate, pluralDays, rentalDays, todayIso } from '@/lib/rental'

type Booking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  status: string
  created_at: string
  reviews?: { id: string }[]
  inspections?: Pick<Inspection, 'kind' | 'odometer_km' | 'fuel_eighths' | 'damages' | 'extra_charges' | 'extra_total'>[]
  vehicle: { id: string; brand: string; model: string; images: string[] | null; image_url: string | null } | null
}

const toneClass: Record<string, string> = {
  wait: 'bg-warning/15 text-warning',
  ok: 'bg-success/15 text-success',
  done: 'bg-muted text-foreground',
  off: 'bg-muted text-muted-foreground line-through',
}

export default function MyBookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const busyRef = useRef(false)
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState<string | null>(null)
  // Confirmação dentro do card: o window.confirm é bloqueado por alguns navegadores
  // e apps (o clique "não fazia nada"), então a pergunta é feita na própria página.
  const [confirming, setConfirming] = useState<string | null>(null)
  const [cardError, setCardError] = useState<{ id: string; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/bookings/my', { credentials: 'include' })
      const data = await response.json()
      setBookings(data.bookings || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/auth/signin?redirect=%2Fprofile%2Fbookings')
      return
    }
    load()
  }, [authLoading, isAuthenticated, load, router])

  const cancel = async (b: Booking) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(b.id)
    setMessage('')
    setCardError(null)
    try {
      const response = await fetch(`/api/bookings/${b.id}/cancel`, { method: 'POST', credentials: 'include' })
      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        setConfirming(null)
        setMessage('Reserva cancelada.')
        await load()
      } else {
        setCardError({ id: b.id, text: result.error || 'Não foi possível cancelar. Tente de novo.' })
      }
    } catch {
      setCardError({ id: b.id, text: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.' })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="container flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Carregando" />
      </main>
    )
  }

  const today = todayIso()

  return (
    <main className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold">Minhas reservas</h1>
      {message && <p role="status" className="mt-4 rounded-md bg-muted p-3 text-sm">{message}</p>}

      {bookings.length === 0 ? (
        <div className="mt-8 rounded-lg border p-6">
          <p className="font-medium">Você ainda não tem reservas.</p>
          <Button asChild className="mt-4"><Link href="/">Escolher um carro</Link></Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4">
          {bookings.map((b) => {
            const status = BOOKING_STATUS[b.status] ?? { label: b.status, tone: 'done' as const }
            const image = b.vehicle?.images?.[0] || b.vehicle?.image_url
            const canCancel = ['pending', 'confirmed'].includes(b.status) && b.start_date > today
            const canReview = b.status === 'completed' && !(b.reviews && b.reviews.length)
            return (
              <li key={b.id} className="overflow-hidden rounded-lg border bg-card">
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-44">
                    {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-bold">
                          {b.vehicle ? (
                            <Link href={`/vehicles/${b.vehicle.id}`} className="hover:text-electric">{b.vehicle.brand} {b.vehicle.model}</Link>
                          ) : 'Carro removido da frota'}
                        </p>
                        <p className="text-sm text-muted-foreground">Código ASTA-{b.id.slice(0, 8).toUpperCase()}</p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-sm font-medium ${toneClass[status.tone]}`}>{status.label}</span>
                    </div>
                    <p className="text-sm">
                      {formatLongDate(b.start_date)} até {formatLongDate(b.end_date)}
                    </p>
                    <InspectionNote inspections={b.inspections} />
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
                      <p>
                        <span className="text-xl font-bold">{formatBRL(Number(b.total_amount))}</span>
                        <span className="ml-2 text-sm text-muted-foreground">{pluralDays(rentalDays(b.start_date, b.end_date))}</span>
                      </p>
                      <div className="flex gap-2">
                        {canReview && (
                          <Button variant="outline" size="sm" onClick={() => setReviewing(reviewing === b.id ? null : b.id)}>
                            Avaliar o carro
                          </Button>
                        )}
                        {canCancel && confirming !== b.id && (
                          <Button variant="outline" size="sm" onClick={() => { setConfirming(b.id); setCardError(null) }}
                            className="text-destructive hover:text-destructive">
                            Cancelar reserva
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {confirming === b.id && (
                  <div role="alertdialog" aria-labelledby={`cancelar-${b.id}`} className="flex flex-col gap-3 border-t bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p id={`cancelar-${b.id}`} className="text-sm">
                      Cancelar a reserva de <strong>{b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : 'o carro'}</strong> para {formatLongDate(b.start_date)}? Isso não pode ser desfeito.
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="ghost" size="sm" disabled={busy === b.id} onClick={() => setConfirming(null)}>Manter reserva</Button>
                      <Button variant="destructive" size="sm" disabled={busy === b.id} onClick={() => cancel(b)}>
                        {busy === b.id && <Loader2 className="h-4 w-4 animate-spin" />}
                        {busy === b.id ? 'Cancelando...' : 'Sim, cancelar'}
                      </Button>
                    </div>
                  </div>
                )}
                {cardError?.id === b.id && (
                  <p role="alert" className="border-t bg-destructive/10 p-3 text-sm text-destructive">{cardError.text}</p>
                )}
                {reviewing === b.id && b.vehicle && (
                  <div className="border-t p-4">
                    <ReviewForm bookingId={b.id} vehicleId={b.vehicle.id} onSuccess={() => { setReviewing(null); setMessage('Avaliação enviada. Ela aparece no site depois da moderação.'); load() }} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

/** Resumo da vistoria para o cliente: o que foi anotado na retirada e na devolução. */
function InspectionNote({ inspections }: { inspections?: Booking['inspections'] }) {
  const pickup = inspections?.find((i) => i.kind === 'pickup')
  if (!pickup) return null
  const ret = inspections?.find((i) => i.kind === 'return')
  const c = ret ? compareInspections(pickup, ret) : null
  return (
    <div className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
      <p>
        <span className="font-semibold text-foreground">Vistoria na retirada:</span> {pickup.odometer_km.toLocaleString('pt-BR')} km, {fuelLabel(pickup.fuel_eighths).toLowerCase()}
        {pickup.damages.length > 0 ? `, ${pickup.damages.length} avaria(s) já existente(s)` : ', sem avarias'}.
      </p>
      {ret && c && (
        <p className="mt-0.5">
          <span className="font-semibold text-foreground">Na devolução:</span> você rodou {c.km.toLocaleString('pt-BR')} km
          {c.missingEighths > 0 ? `, voltou com ${c.missingEighths}/8 a menos no tanque` : ', combustível em dia'}
          {Number(ret.extra_total) > 0 ? `. Cobranças extras: ${formatBRL(Number(ret.extra_total))} (${ret.extra_charges.map((x) => x.label).join(', ')}).` : '. Nenhuma cobrança extra.'}
        </p>
      )}
    </div>
  )
}

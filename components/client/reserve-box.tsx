'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { PriceLine } from '@/lib/pricing'
import { addDaysIso, formatBRL, MAX_RENTAL_DAYS, pluralDays, rentalDays, todayIso } from '@/lib/rental'

type Props = {
  vehicleId: string
  dailyRate: number
  initialStart?: string
  initialEnd?: string
  available: boolean
}

export const dateInputClass =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function ReserveBox({ vehicleId, dailyRate, initialStart, initialEnd, available }: Props) {
  const today = todayIso()
  const [start, setStart] = useState(initialStart ?? addDaysIso(today, 1))
  const [end, setEnd] = useState(initialEnd ?? addDaysIso(today, 4))

  const days = start && end ? rentalDays(start, end) : 0
  const valid = start >= today && days >= 1 && days <= MAX_RENTAL_DAYS

  // Mesma cotação do checkout (temporada e desconto por duração), calculada no servidor.
  const [quote, setQuote] = useState<{ key: string; lines: PriceLine[]; rental: number } | null>(null)
  const key = `${start}|${end}`
  useEffect(() => {
    if (!valid) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehicle_id: vehicleId, start_date: start, end_date: end }),
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { quote: { base: number; discount: number; lines: PriceLine[] } }
        const lines = data.quote.lines.filter((l) => l.kind === 'base' || l.kind === 'season' || l.kind === 'discount')
        setQuote({ key: `${start}|${end}`, lines, rental: data.quote.base - data.quote.discount })
      } catch {
        // Sem a cotação, a caixa continua mostrando diária × dias.
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [vehicleId, start, end, valid])
  const current = quote?.key === key ? quote : null
  const adjusted = current?.lines.some((l) => l.kind !== 'base') ?? false

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-black/10">
      <p className="text-xs text-muted-foreground">Valor da diária</p>
      <p className="tabular text-3xl font-black">{formatBRL(dailyRate)}<span className="text-sm font-medium text-muted-foreground">/dia</span></p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="rb-retirada">Retirada</Label>
          <input id="rb-retirada" type="date" min={today} value={start} className={dateInputClass}
            onChange={(e) => { setStart(e.target.value); if (e.target.value && end <= e.target.value) setEnd(addDaysIso(e.target.value, 1)) }} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="rb-devolucao">Devolução</Label>
          <input id="rb-devolucao" type="date" min={start ? addDaysIso(start, 1) : today} value={end} className={dateInputClass}
            onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      {valid && adjusted && current && (
        <ul className="mt-5 space-y-1 border-t pt-4 text-sm" aria-label="Detalhe das diárias">
          {current.lines.map((l) => (
            <li key={`${l.kind}-${l.code}`} className="flex justify-between gap-3">
              <span className={l.amount < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{l.label}</span>
              <span className={`tabular ${l.amount < 0 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}>
                {l.amount < 0 ? `− ${formatBRL(-l.amount)}` : formatBRL(l.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className={`flex items-end justify-between ${valid && adjusted ? 'mt-3 pt-3 border-t border-dashed' : 'mt-5 border-t pt-4'}`}>
        <span className="text-sm text-muted-foreground">
          {!valid ? 'Escolha um período válido' : adjusted ? `Diárias (${pluralDays(days)})` : `${pluralDays(days)} de ${formatBRL(dailyRate)}`}
        </span>
        {valid && (
          <span className="text-xl font-bold">
            <span className="tabular font-black text-electric">{formatBRL(current ? current.rental : dailyRate * days)}</span>
          </span>
        )}
      </div>
      {valid && <p className="mt-1 text-xs text-muted-foreground">Proteção e opcionais você escolhe na próxima etapa.</p>}

      {available ? (
        valid ? (
          <Button asChild variant="brand" size="lg" className="mt-4 w-full">
            <Link href={`/vehicles/${vehicleId}/checkout?retirada=${start}&devolucao=${end}`}>Continuar para a reserva</Link>
          </Button>
        ) : (
          <Button size="lg" className="mt-4 w-full" disabled>Continuar para a reserva</Button>
        )
      ) : (
        <p className="mt-4 rounded-lg bg-muted p-3 text-sm">Este carro está indisponível para reservas no momento.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Pague online (Pix, cartão ou boleto) ou na retirada.</p>
    </div>
  )
}

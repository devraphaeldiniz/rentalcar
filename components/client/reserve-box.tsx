'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

      <div className="mt-5 flex items-end justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">{valid ? `${pluralDays(days)} de ${formatBRL(dailyRate)}` : 'Escolha um período válido'}</span>
        {valid && <span className="text-xl font-bold"><span className="tabular font-black text-electric">{formatBRL(dailyRate * days)}</span></span>}
      </div>

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
      <p className="mt-3 text-xs text-muted-foreground">Pagamento na retirada. Nenhuma cobrança online.</p>
    </div>
  )
}

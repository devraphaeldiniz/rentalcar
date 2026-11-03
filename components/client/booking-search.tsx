'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { addDaysIso, MAX_RENTAL_DAYS, rentalDays, todayIso } from '@/lib/rental'

type Props = {
  initialStart?: string
  initialEnd?: string
  category?: string
}

export function BookingSearch({ initialStart, initialEnd, category }: Props) {
  const router = useRouter()
  const today = todayIso()
  const [start, setStart] = useState(initialStart ?? addDaysIso(today, 1))
  const [end, setEnd] = useState(initialEnd ?? addDaysIso(today, 4))
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!start || !end) return setError('Escolha a data de retirada e a de devolução.')
    if (start < today) return setError('A retirada não pode ser em uma data que já passou.')
    const days = rentalDays(start, end)
    if (days < 1) return setError('A devolução precisa ser depois da retirada.')
    if (days > MAX_RENTAL_DAYS) return setError(`O período máximo é de ${MAX_RENTAL_DAYS} diárias.`)
    setError('')
    const params = new URLSearchParams({ retirada: start, devolucao: end })
    if (category) params.set('categoria', category)
    router.push(`/?${params.toString()}#carros`)
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-lg bg-background p-4 text-foreground shadow-lg sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      aria-label="Buscar carros por período"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="retirada">Retirada</Label>
        <input
          id="retirada"
          type="date"
          min={today}
          value={start}
          onChange={(e) => {
            setStart(e.target.value)
            if (e.target.value && end <= e.target.value) setEnd(addDaysIso(e.target.value, 1))
          }}
          className="h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="devolucao">Devolução</Label>
        <input
          id="devolucao"
          type="date"
          min={start ? addDaysIso(start, 1) : today}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="h-11 rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
        />
      </div>
      <Button type="submit" size="lg" className="h-11">
        Ver carros
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-3">
          {error}
        </p>
      )}
    </form>
  )
}

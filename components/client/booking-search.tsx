'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck, CalendarPlus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDaysIso, MAX_RENTAL_DAYS, pluralDays, rentalDays, todayIso } from '@/lib/rental'
import { track } from '@/lib/analytics/client'

type Props = {
  initialStart?: string
  initialEnd?: string
  category?: string
}

const fieldBox =
  'group rounded-xl border bg-background/60 px-4 py-3 transition-colors focus-within:border-electric hover:border-electric/50'
const fieldInput =
  'mt-1 w-full bg-transparent text-base font-semibold text-foreground focus:outline-none'

export function BookingSearch({ initialStart, initialEnd, category }: Props) {
  const router = useRouter()
  const today = todayIso()
  const [start, setStart] = useState(initialStart ?? addDaysIso(today, 1))
  const [end, setEnd] = useState(initialEnd ?? addDaysIso(today, 4))
  const [error, setError] = useState('')
  const days = start && end ? rentalDays(start, end) : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!start || !end) return setError('Escolha a data de retirada e a de devolução.')
    if (start < today) return setError('A retirada não pode ser em uma data que já passou.')
    if (days < 1) return setError('A devolução precisa ser depois da retirada.')
    if (days > MAX_RENTAL_DAYS) return setError(`O período máximo é de ${MAX_RENTAL_DAYS} diárias.`)
    setError('')
    track('search', { meta: { days, ...(category ? { category } : {}), leadDays: rentalDays(today, start) } })
    const params = new URLSearchParams({ retirada: start, devolucao: end })
    if (category) params.set('categoria', category)
    router.push(`/?${params.toString()}#carros`)
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border bg-card/95 p-4 text-card-foreground shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6"
      aria-label="Buscar carros por período"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-stretch">
        <label className={fieldBox} htmlFor="retirada">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarPlus className="h-4 w-4 text-electric" aria-hidden /> Retirada
          </span>
          <input
            id="retirada"
            type="date"
            min={today}
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
              if (e.target.value && end <= e.target.value) setEnd(addDaysIso(e.target.value, 1))
            }}
            className={fieldInput}
            required
          />
        </label>
        <label className={fieldBox} htmlFor="devolucao">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CalendarCheck className="h-4 w-4 text-electric" aria-hidden /> Devolução
          </span>
          <input
            id="devolucao"
            type="date"
            min={start ? addDaysIso(start, 1) : today}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className={fieldInput}
            required
          />
        </label>
        <Button type="submit" variant="brand" size="lg" className="h-auto min-h-14 rounded-xl px-8">
          <Search className="h-5 w-5" />
          Buscar carros
        </Button>
      </div>
      <div className="mt-3 flex min-h-5 flex-wrap items-center justify-between gap-2 text-sm">
        {error ? (
          <p role="alert" className="text-destructive">{error}</p>
        ) : (
          <p className="text-muted-foreground">
            {days >= 1 && days <= MAX_RENTAL_DAYS ? `${pluralDays(days)} · você vê o valor total de cada carro` : 'Escolha um período de até ' + MAX_RENTAL_DAYS + ' diárias'}
          </p>
        )}
        <p className="text-muted-foreground">Pix, cartão ou na retirada</p>
      </div>
    </form>
  )
}

export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql } from '@/lib/auth/authorization'
import { QuoteError } from '@/lib/pricing'
import { quoteReservation } from '@/lib/quote-server'
import { isIsoDate, MAX_RENTAL_DAYS, rentalDays } from '@/lib/rental'

const input = z.object({
  vehicle_id: z.string().uuid(),
  start_date: z.string().refine(isIsoDate),
  end_date: z.string().refine(isIsoDate),
  protection: z.string().max(40).optional(),
  addons: z.array(z.string().max(40)).max(10).optional(),
  coupon: z.string().max(30).optional(),
})

// Cotação do checkout: o mesmo cálculo que grava a reserva.
export async function POST(req: NextRequest) {
  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { vehicle_id, start_date, end_date, protection, addons, coupon } = parsed.data
  const days = rentalDays(start_date, end_date)
  if (days < 1 || days > MAX_RENTAL_DAYS) return NextResponse.json({ error: 'Período inválido' }, { status: 400 })

  try {
    const v = await adminGraphql<{ vehicles_by_pk: { daily_rate: number; status: string } | null }>(
      `query V($id: uuid!) { vehicles_by_pk(id: $id) { daily_rate status } }`,
      { id: vehicle_id },
    )
    if (!v.vehicles_by_pk || v.vehicles_by_pk.status === 'maintenance') return NextResponse.json({ error: 'Carro indisponível' }, { status: 404 })
    const result = await quoteReservation({ dailyRate: Number(v.vehicles_by_pk.daily_rate), start: start_date, end: end_date, protection, addons, coupon })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof QuoteError) return NextResponse.json({ error: error.message }, { status: 400 })
    console.error('[quote]', error)
    return NextResponse.json({ error: 'Não foi possível calcular o valor agora' }, { status: 500 })
  }
}

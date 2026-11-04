// Regras de preço vindas do banco: descontos por duração, temporadas e cupons.
// Funções puras, usadas pelo servidor ao cotar e ao gravar a reserva.

import { addDaysIso } from '@/lib/rental'
import { cents, type Adjustment, type Discount } from '@/lib/pricing'

export type PricingRule = {
  id?: string
  kind: 'duration' | 'season'
  name: string
  min_days: number | null
  start_date: string | null
  end_date: string | null
  percent: number
  active?: boolean
}

export type Coupon = {
  code: string
  description?: string | null
  percent: number | null
  amount: number | null
  min_days: number
  valid_from: string | null
  valid_until: string | null
  max_uses: number | null
  uses: number
  active: boolean
}

const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

/** Diárias do período: cada data de retirada até a véspera da devolução. */
export function rentalNights(start: string, end: string): string[] {
  const out: string[] = []
  for (let d = start; d < end && out.length <= 120; d = addDaysIso(d, 1)) out.push(d)
  return out
}

export function seasonAdjustments(rules: PricingRule[], dailyRate: number, start: string, end: string): Adjustment[] {
  const nights = rentalNights(start, end)
  const out: Adjustment[] = []
  for (const r of rules) {
    if (r.kind !== 'season' || r.active === false || !r.start_date || !r.end_date) continue
    const inSeason = nights.filter((n) => n >= (r.start_date as string) && n <= (r.end_date as string)).length
    if (!inSeason) continue
    const amount = cents((dailyRate * inSeason * r.percent) / 100)
    const sign = r.percent > 0 ? '+' : '−'
    out.push({
      code: `temporada:${r.id ?? r.name}`,
      label: r.name,
      detail: `${sign}${fmtPct(Math.abs(r.percent))} em ${inSeason} ${inSeason === 1 ? 'diária' : 'diárias'}`,
      amount,
    })
  }
  return out
}

/** O maior desconto por duração que o período alcança (não acumulam entre si). */
export function durationDiscount(rules: PricingRule[], days: number): Discount | null {
  const best = rules
    .filter((r) => r.kind === 'duration' && r.active !== false && r.min_days != null && days >= r.min_days)
    .sort((a, b) => (b.min_days as number) - (a.min_days as number))[0]
  return best ? { code: 'duracao', label: `${best.name} (${best.min_days}+ diárias)`, percent: Number(best.percent) } : null
}

export const normalizeCoupon = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20)

export class CouponError extends Error {}

export function couponDiscount(coupon: Coupon | null | undefined, { days, today }: { days: number; today: string }): Discount {
  if (!coupon || !coupon.active) throw new CouponError('Cupom não encontrado ou inativo.')
  if (coupon.valid_from && today < coupon.valid_from) throw new CouponError('Este cupom ainda não está valendo.')
  if (coupon.valid_until && today > coupon.valid_until) throw new CouponError('Este cupom expirou.')
  if (coupon.max_uses != null && coupon.uses >= coupon.max_uses) throw new CouponError('Este cupom já atingiu o limite de usos.')
  if (days < coupon.min_days) throw new CouponError(`Este cupom vale a partir de ${coupon.min_days} diárias.`)
  return coupon.percent != null
    ? { code: `cupom:${coupon.code}`, label: `Cupom ${coupon.code}`, percent: Number(coupon.percent) }
    : { code: `cupom:${coupon.code}`, label: `Cupom ${coupon.code}`, amount: Number(coupon.amount) }
}

import { adminGraphql } from '@/lib/auth/authorization'
import { computeQuote, type Quote } from '@/lib/pricing'
import { getActiveExtras } from '@/lib/extras-server'
import { CouponError, couponDiscount, durationDiscount, normalizeCoupon, seasonAdjustments, type Coupon, type PricingRule } from '@/lib/pricing-rules'
import { rentalDays, todayIso } from '@/lib/rental'

type RuleRow = Omit<PricingRule, 'percent'> & { percent: string | number }
type CouponRow = Omit<Coupon, 'percent' | 'amount'> & { percent: string | number | null; amount: string | number | null }

const toRule = (r: RuleRow): PricingRule => ({ ...r, percent: Number(r.percent) })
const toCoupon = (c: CouponRow): Coupon => ({
  ...c,
  percent: c.percent == null ? null : Number(c.percent),
  amount: c.amount == null ? null : Number(c.amount),
})

export async function getActiveRules(): Promise<PricingRule[]> {
  const data = await adminGraphql<{ pricing_rules: RuleRow[] }>(
    `query Rules { pricing_rules(where: { active: { _eq: true } }) { id kind name min_days start_date end_date percent active } }`,
  )
  return data.pricing_rules.map(toRule)
}

export async function findCoupon(code: string): Promise<Coupon | null> {
  const data = await adminGraphql<{ coupons: CouponRow[] }>(
    `query C($code: String!) { coupons(where: { code: { _eq: $code } }, limit: 1) {
      code description percent amount min_days valid_from valid_until max_uses uses active
    } }`,
    { code },
  )
  return data.coupons[0] ? toCoupon(data.coupons[0]) : null
}

/** Diárias com temporada e desconto por duração, sem opcionais (para a vitrine). */
export function periodPrice(dailyRate: number, start: string, end: string, rules: PricingRule[]) {
  const days = rentalDays(start, end)
  const q = computeQuote({
    dailyRate,
    days,
    extras: [],
    adjustments: seasonAdjustments(rules, dailyRate, start, end),
    discounts: [durationDiscount(rules, days)].filter(Boolean) as NonNullable<ReturnType<typeof durationDiscount>>[],
  })
  return { total: q.total, full: Math.round(dailyRate * days * 100) / 100, discountLabel: q.lines.find((l) => l.kind === 'discount')?.label ?? null }
}

type QuoteRequest = {
  dailyRate: number
  start: string
  end: string
  protection?: string | null
  addons?: string[]
  coupon?: string | null
}

export type ServerQuote = { quote: Quote; coupon: string | null; couponError: string | null }

/** Cotação oficial: preços, regras e cupom lidos agora do banco. */
export async function quoteReservation(req: QuoteRequest): Promise<ServerQuote> {
  const days = rentalDays(req.start, req.end)
  const [extras, rules] = await Promise.all([getActiveExtras(), getActiveRules()])

  const discounts = [durationDiscount(rules, days)].filter(Boolean) as NonNullable<ReturnType<typeof durationDiscount>>[]
  let coupon: string | null = null
  let couponError: string | null = null
  const code = req.coupon ? normalizeCoupon(req.coupon) : ''
  if (code) {
    try {
      discounts.push(couponDiscount(await findCoupon(code), { days, today: todayIso() }))
      coupon = code
    } catch (error) {
      if (!(error instanceof CouponError)) throw error
      couponError = error.message
    }
  }

  const quote = computeQuote({
    dailyRate: req.dailyRate,
    days,
    extras,
    protectionCode: req.protection || null,
    addonCodes: req.addons ?? [],
    adjustments: seasonAdjustments(rules, req.dailyRate, req.start, req.end),
    discounts,
  })
  return { quote, coupon, couponError }
}

/** Reserva um uso do cupom de forma atômica. Devolve false se esgotou no meio do caminho. */
export async function claimCoupon(code: string): Promise<boolean> {
  const data = await adminGraphql<{ update_coupons: { affected_rows: number } }>(
    `mutation Claim($code: String!) {
      update_coupons(where: { code: { _eq: $code }, active: { _eq: true } }, _inc: { uses: 1 }) { affected_rows }
    }`,
    { code },
  ).catch(() => ({ update_coupons: { affected_rows: 0 } }))
  // O CHECK coupons_limit no banco impede passar do limite; se falhar, affected_rows fica 0.
  return data.update_coupons.affected_rows === 1
}

export async function releaseCoupon(code: string) {
  await adminGraphql(
    `mutation Release($code: String!) { update_coupons(where: { code: { _eq: $code }, uses: { _gt: 0 } }, _inc: { uses: -1 }) { affected_rows } }`,
    { code },
  ).catch(() => {})
}

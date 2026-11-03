import { describe, expect, it } from 'vitest'
import { computeQuote, type Extra } from '@/lib/pricing'
import { CouponError, couponDiscount, durationDiscount, normalizeCoupon, rentalNights, seasonAdjustments, type Coupon, type PricingRule } from '@/lib/pricing-rules'

const rules: PricingRule[] = [
  { kind: 'duration', name: 'Semanal', min_days: 7, start_date: null, end_date: null, percent: 10 },
  { kind: 'duration', name: 'Mensal', min_days: 30, start_date: null, end_date: null, percent: 25 },
  { kind: 'duration', name: 'Inativo', min_days: 3, start_date: null, end_date: null, percent: 50, active: false },
  { id: 'natal', kind: 'season', name: 'Fim de ano', min_days: null, start_date: '2026-12-20', end_date: '2027-01-05', percent: 20 },
]
const extras: Extra[] = [{ code: 'basica', kind: 'protection', name: 'Básica', price: 0, pricing: 'per_day', max_total: null, is_default: true }]

const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  code: 'BEMVINDO10', percent: 10, amount: null, min_days: 2, valid_from: null, valid_until: '2027-06-30', max_uses: 100, uses: 0, active: true, ...over,
})

describe('regras de preço', () => {
  it('conta as diárias pela noite: retirada até a véspera da devolução', () => {
    expect(rentalNights('2026-12-18', '2026-12-22')).toEqual(['2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21'])
  })

  it('aplica a temporada só nas diárias dentro dela', () => {
    const adj = seasonAdjustments(rules, 100, '2026-12-18', '2026-12-22')
    expect(adj).toEqual([{ code: 'temporada:natal', label: 'Fim de ano', detail: '+20% em 2 diárias', amount: 40 }])
  })

  it('usa o maior desconto por duração alcançado, ignorando inativos', () => {
    expect(durationDiscount(rules, 6)).toBeNull()
    expect(durationDiscount(rules, 10)?.percent).toBe(10)
    expect(durationDiscount(rules, 31)?.percent).toBe(25)
  })

  it('combina temporada, duração e cupom na ordem certa', () => {
    const q = computeQuote({
      dailyRate: 100,
      days: 7,
      extras,
      adjustments: seasonAdjustments(rules, 100, '2026-12-28', '2027-01-04'),
      discounts: [durationDiscount(rules, 7)!, couponDiscount(coupon(), { days: 7, today: '2026-11-03' })],
    })
    // 700 + 20% em 7 diárias (140) = 840; −10% = 756; −10% = 680,40
    expect(q.base).toBe(840)
    expect(q.total).toBe(680.4)
    expect(q.discount).toBe(159.6)
  })
})

describe('cupons', () => {
  const today = '2026-11-03'
  it('normaliza o código digitado', () => {
    expect(normalizeCoupon(' bem-vindo10 ')).toBe('BEMVINDO10')
  })
  it('recusa inativo, vencido, esgotado, antes da hora e abaixo do mínimo', () => {
    expect(() => couponDiscount(null, { days: 3, today })).toThrow(CouponError)
    expect(() => couponDiscount(coupon({ active: false }), { days: 3, today })).toThrow('inativo')
    expect(() => couponDiscount(coupon({ valid_until: '2026-01-01' }), { days: 3, today })).toThrow('expirou')
    expect(() => couponDiscount(coupon({ uses: 100 }), { days: 3, today })).toThrow('limite')
    expect(() => couponDiscount(coupon({ valid_from: '2026-12-01' }), { days: 3, today })).toThrow('ainda não')
    expect(() => couponDiscount(coupon(), { days: 1, today })).toThrow('2 diárias')
  })
  it('aceita valor fixo', () => {
    expect(couponDiscount(coupon({ percent: null, amount: 50 }), { days: 3, today })).toMatchObject({ amount: 50 })
  })
})

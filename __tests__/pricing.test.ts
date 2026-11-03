import { describe, expect, it } from 'vitest'
import { computeQuote, extraTotal, QuoteError, type Extra } from '@/lib/pricing'

const EXTRAS: Extra[] = [
  { code: 'protecao_basica', kind: 'protection', name: 'Proteção básica', price: 0, pricing: 'per_day', max_total: null, is_default: true, sort: 1 },
  { code: 'protecao_total', kind: 'protection', name: 'Proteção total', price: 59, pricing: 'per_day', max_total: null, is_default: false, sort: 3 },
  { code: 'cadeirinha', kind: 'addon', name: 'Cadeirinha', price: 20, pricing: 'per_day', max_total: 200, is_default: false, sort: 11 },
  { code: 'tanque_cheio', kind: 'addon', name: 'Tanque cheio', price: 180, pricing: 'per_rental', max_total: null, is_default: false, sort: 13 },
]

describe('valor da reserva', () => {
  it('sem escolhas, usa a proteção padrão incluída', () => {
    const q = computeQuote({ dailyRate: 124.9, days: 4, extras: EXTRAS })
    expect(q).toMatchObject({ base: 499.6, extras: 0, discount: 0, total: 499.6, protection: 'protecao_basica' })
    expect(q.lines.map((l) => l.code)).toEqual(['diarias', 'protecao_basica'])
  })

  it('soma proteção, opcionais por diária com teto e opcional de valor único', () => {
    const q = computeQuote({ dailyRate: 100, days: 12, extras: EXTRAS, protectionCode: 'protecao_total', addonCodes: ['tanque_cheio', 'cadeirinha', 'cadeirinha'] })
    // 1200 + 59×12 (708) + cadeirinha limitada a 200 + 180
    expect(q).toMatchObject({ base: 1200, extras: 1088, total: 2288, addons: ['cadeirinha', 'tanque_cheio'] })
  })

  it('aplica descontos só nas diárias, em sequência e sem passar de zero', () => {
    const q = computeQuote({
      dailyRate: 100,
      days: 7,
      extras: EXTRAS,
      addonCodes: ['tanque_cheio'],
      discounts: [{ code: 'semanal', label: 'Semana', percent: 10 }, { code: 'CUPOM', label: 'Cupom', amount: 5000 }],
    })
    expect(q.discount).toBe(700)
    expect(q.total).toBe(180)
    expect(q.lines.filter((l) => l.kind === 'discount').map((l) => l.amount)).toEqual([-70, -630])
  })

  it('recusa proteção ou opcional que não existe (ou trocado de tipo)', () => {
    expect(() => computeQuote({ dailyRate: 100, days: 2, extras: EXTRAS, protectionCode: 'cadeirinha' })).toThrow(QuoteError)
    expect(() => computeQuote({ dailyRate: 100, days: 2, extras: EXTRAS, addonCodes: ['protecao_total'] })).toThrow(QuoteError)
    expect(() => computeQuote({ dailyRate: 100, days: 0, extras: EXTRAS })).toThrow(QuoteError)
  })

  it('arredonda ao centavo', () => {
    expect(extraTotal({ price: 12.345, pricing: 'per_day', max_total: null }, 3)).toBe(37.04)
  })
})

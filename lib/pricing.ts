// Cálculo do valor da reserva. É a mesma função no navegador (para mostrar)
// e no servidor (que é quem decide o valor gravado). Valores em reais, arredondados ao centavo.

export type Extra = {
  code: string
  kind: 'protection' | 'addon'
  name: string
  description?: string | null
  price: number
  pricing: 'per_day' | 'per_rental'
  max_total: number | null
  is_default: boolean
  sort?: number
}

/** Desconto aplicado sobre as diárias (duração, temporada, cupom). */
export type Discount = {
  code: string
  label: string
  /** Percentual (10 = 10%) ou valor fixo em reais. Use um dos dois. */
  percent?: number
  amount?: number
}

export type PriceLine = {
  kind: 'base' | 'protection' | 'addon' | 'discount'
  code: string
  label: string
  detail: string
  amount: number
}

export type Quote = {
  days: number
  dailyRate: number
  base: number
  extras: number
  discount: number
  total: number
  protection: string
  addons: string[]
  lines: PriceLine[]
}

export const cents = (n: number) => Math.round(n * 100) / 100
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function extraTotal(extra: Pick<Extra, 'price' | 'pricing' | 'max_total'>, days: number) {
  const raw = extra.pricing === 'per_rental' ? extra.price : extra.price * days
  return cents(extra.max_total != null ? Math.min(raw, extra.max_total) : raw)
}

export function extraDetail(extra: Pick<Extra, 'price' | 'pricing' | 'max_total'>, days: number) {
  if (extra.pricing === 'per_rental') return 'valor único'
  const capped = extra.max_total != null && extra.price * days > extra.max_total
  return capped ? `${days} × ${brl(extra.price)}, limitado a ${brl(extra.max_total as number)}` : `${days} × ${brl(extra.price)}`
}

export const defaultProtection = (extras: Extra[]) =>
  extras.find((e) => e.kind === 'protection' && e.is_default) ?? extras.find((e) => e.kind === 'protection')

type QuoteInput = {
  dailyRate: number
  days: number
  extras: Extra[]
  protectionCode?: string | null
  addonCodes?: string[]
  discounts?: Discount[]
}

export class QuoteError extends Error {}

export function computeQuote({ dailyRate, days, extras, protectionCode, addonCodes = [], discounts = [] }: QuoteInput): Quote {
  if (!Number.isFinite(dailyRate) || dailyRate < 0) throw new QuoteError('Diária inválida.')
  if (!Number.isInteger(days) || days < 1) throw new QuoteError('Período inválido.')

  const byCode = new Map(extras.map((e) => [e.code, e]))
  const protection = protectionCode ? byCode.get(protectionCode) : defaultProtection(extras)
  if (protectionCode && (!protection || protection.kind !== 'protection')) throw new QuoteError('Proteção indisponível.')

  const addons: Extra[] = []
  for (const code of new Set(addonCodes)) {
    const addon = byCode.get(code)
    if (!addon || addon.kind !== 'addon') throw new QuoteError('Opcional indisponível.')
    addons.push(addon)
  }
  addons.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))

  const base = cents(dailyRate * days)
  const lines: PriceLine[] = [
    { kind: 'base', code: 'diarias', label: days === 1 ? '1 diária' : `${days} diárias`, detail: `${days} × ${brl(dailyRate)}`, amount: base },
  ]

  // Descontos incidem só sobre as diárias, um depois do outro, e nunca deixam o valor negativo.
  let discounted = base
  for (const d of discounts) {
    const value = d.percent != null ? (discounted * d.percent) / 100 : (d.amount ?? 0)
    const amount = cents(Math.min(Math.max(value, 0), discounted))
    if (amount <= 0) continue
    discounted = cents(discounted - amount)
    lines.push({ kind: 'discount', code: d.code, label: d.label, detail: d.percent != null ? `${d.percent}% sobre as diárias` : 'desconto', amount: -amount })
  }

  let extrasTotal = 0
  for (const e of protection ? [protection, ...addons] : addons) {
    const amount = extraTotal(e, days)
    extrasTotal += amount
    lines.push({ kind: e.kind, code: e.code, label: e.name, detail: amount === 0 ? 'incluída' : extraDetail(e, days), amount })
  }
  extrasTotal = cents(extrasTotal)

  return {
    days,
    dailyRate,
    base,
    extras: extrasTotal,
    discount: cents(base - discounted),
    total: cents(discounted + extrasTotal),
    protection: protection?.code ?? '',
    addons: addons.map((a) => a.code),
    lines,
  }
}

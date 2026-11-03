// Regras de exibição compartilhadas entre a busca, os cards e o checkout.
// O valor cobrado de verdade é sempre recalculado no servidor (api/bookings/create).

export const CATEGORY_LABELS: Record<string, string> = {
  economy: 'Econômico',
  standard: 'Intermediário',
  suv: 'SUV',
  minivan: '7 lugares',
  pickup: 'Picape',
  electric: 'Elétrico e híbrido',
  luxury: 'Executivo',
  sports: 'Esportivo',
}

export const CATEGORY_ORDER = ['economy', 'standard', 'suv', 'minivan', 'pickup', 'electric', 'luxury', 'sports'] as const

export const MAX_RENTAL_DAYS = 90

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

/** Número de diárias entre retirada e devolução (mesma regra da API). */
export function rentalDays(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)
  return Math.ceil(ms / 86_400_000)
}

/** Data local de hoje em AAAA-MM-DD (fuso de quem está usando). */
export function todayIso(): string {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export type DateRange = { start: string; end: string; days: number }

/** Valida o período vindo da URL; devolve null se estiver ausente ou inválido. */
export function parseRange(start?: string | null, end?: string | null, today = todayIso()): DateRange | null {
  if (!isIsoDate(start) || !isIsoDate(end)) return null
  if (start < today) return null
  const days = rentalDays(start, end)
  if (days < 1 || days > MAX_RENTAL_DAYS) return null
  return { start, end, days }
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatBRL = (value: number) => brl.format(value)

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
export const formatShortDate = (iso: string) => shortDate.format(new Date(`${iso}T00:00:00Z`)).replace('.', '')

export const pluralDays = (n: number) => `${n} ${n === 1 ? 'diária' : 'diárias'}`

const longDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })
/** Datas de reserva são dias de calendário: formatar em UTC evita mostrar o dia anterior no Brasil. */
export const formatLongDate = (iso: string) => {
  const s = longDate.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const BOOKING_STATUS: Record<string, { label: string; tone: 'wait' | 'ok' | 'done' | 'off' }> = {
  pending: { label: 'Aguardando confirmação', tone: 'wait' },
  confirmed: { label: 'Confirmada', tone: 'ok' },
  active: { label: 'Em andamento', tone: 'ok' },
  completed: { label: 'Concluída', tone: 'done' },
  cancelled: { label: 'Cancelada', tone: 'off' },
}

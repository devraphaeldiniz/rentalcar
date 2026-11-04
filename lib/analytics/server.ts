import { randomUUID } from 'node:crypto'
import { adminGraphql } from '@/lib/auth/authorization'
import type { AnalyticsEvent } from './events'

export const SESSION_COOKIE = 'asta_sid'
export const VISITOR_COOKIE = 'asta_vid'
/** Uma visita termina depois de 30 minutos sem atividade. */
export const SESSION_MAX_AGE = 60 * 30
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365

export const analyticsCookie = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
})

export const newId = () => randomUUID()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const validId = (v: string | undefined | null): v is string => Boolean(v && UUID.test(v))

export function deviceFrom(userAgent: string | null): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent ?? ''
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export const isBot = (userAgent: string | null) =>
  !userAgent || /bot|crawl|spider|slurp|preview|headless|lighthouse|monitor|curl|wget|python|axios/i.test(userAgent)

/** Só a origem de quem mandou a visita (ex.: google.com), nunca a URL completa. */
export function referrerHost(value: string | undefined, ownHost: string | null): string | null {
  if (!value) return null
  try {
    const host = new URL(value).hostname.replace(/^www\./, '')
    if (!host || host === ownHost?.replace(/^www\./, '')) return null
    return host.slice(0, 200)
  } catch {
    return null
  }
}

export type EventRow = {
  session_id: string
  visitor_id?: string | null
  user_id?: string | null
  event: AnalyticsEvent
  path?: string | null
  vehicle_id?: string | null
  meta?: Record<string, unknown>
  device?: string | null
  referrer?: string | null
}

export async function recordEvent(row: EventRow) {
  await adminGraphql(
    `mutation Track($o: analytics_events_insert_input!) { insert_analytics_events_one(object: $o) { id } }`,
    { o: { meta: {}, ...row } },
  )
}

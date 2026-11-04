export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/auth/authorization'
import { CLIENT_EVENTS, FEEDBACK_REASONS } from '@/lib/analytics/events'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
  analyticsCookie,
  deviceFrom,
  isBot,
  newId,
  recordEvent,
  referrerHost,
  validId,
} from '@/lib/analytics/server'
import { getClientIP } from '@/lib/utils/ip'

const metaValue = z.union([z.string().max(300), z.number().finite(), z.boolean()])
const input = z.object({
  event: z.enum(CLIENT_EVENTS),
  consent: z.boolean().optional(),
  path: z.string().max(300).startsWith('/').optional(),
  vehicleId: z.string().uuid().optional(),
  referrer: z.string().max(500).optional(),
  meta: z
    .record(z.string().max(40), metaValue)
    .refine((m) => Object.keys(m).length <= 8, 'meta grande demais')
    .optional(),
})

// Limite simples por IP e por instância, contra envio em massa.
const WINDOW = 10 * 60 * 1000
const MAX_PER_WINDOW = 150
const hits = new Map<string, { n: number; reset: number }>()
function allowed(ip: string) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || h.reset < now) {
    if (hits.size > 5000) hits.clear()
    hits.set(ip, { n: 1, reset: now + WINDOW })
    return true
  }
  h.n += 1
  return h.n <= MAX_PER_WINDOW
}

// Eventos em que vale identificar quem está logado (poucos, para não
// consultar o Nhost Auth a cada página vista).
const IDENTIFY = new Set(['start_checkout', 'checkout_feedback'])

export async function POST(req: NextRequest) {
  const ua = req.headers.get('user-agent')
  if (isBot(ua)) return new NextResponse(null, { status: 204 })
  if (!allowed(await getClientIP())) return new NextResponse(null, { status: 429 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })
  const { event, consent = false, path, vehicleId, referrer, meta = {} } = parsed.data

  // Sem consentimento, só a resposta explícita do checkout é aceita, e sem cookies.
  if (!consent && event !== 'checkout_feedback') return new NextResponse(null, { status: 204 })

  if (event === 'checkout_feedback') {
    const reason = meta.reason
    if (typeof reason !== 'string' || !(reason in FEEDBACK_REASONS)) {
      return NextResponse.json({ error: 'Motivo inválido' }, { status: 400 })
    }
  }

  const cookieSid = req.cookies.get(SESSION_COOKIE)?.value
  const cookieVid = req.cookies.get(VISITOR_COOKIE)?.value
  const sessionId = consent && validId(cookieSid) ? cookieSid : newId()
  const visitorId = consent ? (validId(cookieVid) ? cookieVid : newId()) : null

  try {
    const auth = IDENTIFY.has(event) ? await requireUser() : null
    await recordEvent({
      session_id: sessionId,
      visitor_id: visitorId,
      user_id: auth?.userId ?? null,
      event,
      path: path ?? null,
      vehicle_id: vehicleId ?? null,
      meta,
      device: deviceFrom(ua),
      referrer: referrerHost(referrer, req.nextUrl.hostname),
    })
  } catch (error) {
    console.error('[track]', error)
    return new NextResponse(null, { status: 202 })
  }

  const res = new NextResponse(null, { status: 204 })
  if (consent) {
    // A visita se renova a cada evento; o visitante dura um ano.
    res.cookies.set(SESSION_COOKIE, sessionId, analyticsCookie(SESSION_MAX_AGE))
    if (visitorId) res.cookies.set(VISITOR_COOKIE, visitorId, analyticsCookie(VISITOR_MAX_AGE))
  }
  return res
}

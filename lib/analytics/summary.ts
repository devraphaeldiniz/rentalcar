import { FEEDBACK_REASONS, type AnalyticsEvent } from './events'

export type RawEvent = {
  session_id: string
  visitor_id: string | null
  user_id: string | null
  event: AnalyticsEvent
  vehicle_id: string | null
  path?: string | null
  referrer?: string | null
  device: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

export const FUNNEL_STEPS = [
  { key: 'visit', label: 'Visitaram o site' },
  { key: 'view_vehicle', label: 'Abriram um carro' },
  { key: 'start_checkout', label: 'Começaram a reserva' },
  { key: 'booking_created', label: 'Reservaram' },
] as const

export type SessionOutcome = 'reservou' | 'desistiu_no_checkout' | 'viu_carros' | 'so_visitou'

export const OUTCOME_LABELS: Record<SessionOutcome, string> = {
  reservou: 'Reservou',
  desistiu_no_checkout: 'Desistiu na reserva',
  viu_carros: 'Viu carros',
  so_visitou: 'Só visitou',
}

export type SessionSummary = {
  sessionId: string
  visitorId: string | null
  userId: string | null
  device: string | null
  referrer: string | null
  startedAt: string
  endedAt: string
  pages: number
  vehicles: string[]
  lastVehicle: string | null
  outcome: SessionOutcome
  reason: string | null
  comment: string | null
}

/** Dia no fuso de Brasília (UTC-3, sem horário de verão desde 2019). */
export const brDay = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10)

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : 0)

export function summarize(events: RawEvent[], { from, to }: { from: string; to: string }) {
  const sessions = new Map<string, RawEvent[]>()
  for (const e of events) {
    const list = sessions.get(e.session_id)
    if (list) list.push(e)
    else sessions.set(e.session_id, [e])
  }

  // Sessões só com a resposta do checkout (sem consentimento) não contam como visita.
  const isVisit = (list: RawEvent[]) => list.some((e) => e.event !== 'checkout_feedback')

  const reached = { visit: 0, view_vehicle: 0, start_checkout: 0, booking_created: 0 }
  const visitors = new Set<string>()
  const daily = new Map<string, number>()
  const devices = new Map<string, number>()
  const referrers = new Map<string, number>()
  const vehicles = new Map<string, { views: number; checkouts: number; bookings: number }>()
  const reasons = new Map<string, number>()
  const summaries: SessionSummary[] = []
  let revenue = 0

  const vehicleStat = (id: string) => {
    let v = vehicles.get(id)
    if (!v) { v = { views: 0, checkouts: 0, bookings: 0 }; vehicles.set(id, v) }
    return v
  }

  for (const [sessionId, list] of sessions) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at))
    const has = (name: AnalyticsEvent) => list.some((e) => e.event === name)
    const feedback = [...list].reverse().find((e) => e.event === 'checkout_feedback')
    if (feedback) {
      const r = String(feedback.meta?.reason ?? 'outro')
      reasons.set(r, (reasons.get(r) ?? 0) + 1)
    }
    if (!isVisit(list)) continue

    const first = list[0]
    reached.visit += 1
    if (has('view_vehicle')) reached.view_vehicle += 1
    if (has('start_checkout')) reached.start_checkout += 1
    if (has('booking_created')) reached.booking_created += 1

    const visitor = list.find((e) => e.visitor_id)?.visitor_id ?? null
    if (visitor) visitors.add(visitor)
    const day = brDay(first.created_at)
    daily.set(day, (daily.get(day) ?? 0) + 1)
    const device = first.device ?? 'desktop'
    devices.set(device, (devices.get(device) ?? 0) + 1)
    const ref = list.find((e) => e.referrer)?.referrer ?? 'acesso direto'
    referrers.set(ref, (referrers.get(ref) ?? 0) + 1)

    // Cada carro conta uma vez por visita em cada etapa.
    const seen = { views: new Set<string>(), checkouts: new Set<string>(), bookings: new Set<string>() }
    for (const e of list) {
      if (!e.vehicle_id) continue
      if (e.event === 'view_vehicle') seen.views.add(e.vehicle_id)
      if (e.event === 'start_checkout') seen.checkouts.add(e.vehicle_id)
      if (e.event === 'booking_created') {
        seen.bookings.add(e.vehicle_id)
        revenue += Number(e.meta?.total ?? 0) || 0
      }
    }
    for (const id of seen.views) vehicleStat(id).views += 1
    for (const id of seen.checkouts) vehicleStat(id).checkouts += 1
    for (const id of seen.bookings) vehicleStat(id).bookings += 1

    const vehicleOrder = list.filter((e) => e.vehicle_id).map((e) => e.vehicle_id as string)
    const outcome: SessionOutcome = has('booking_created')
      ? 'reservou'
      : has('start_checkout')
        ? 'desistiu_no_checkout'
        : has('view_vehicle')
          ? 'viu_carros'
          : 'so_visitou'

    summaries.push({
      sessionId,
      visitorId: visitor,
      userId: list.find((e) => e.user_id)?.user_id ?? null,
      device: first.device,
      referrer: list.find((e) => e.referrer)?.referrer ?? null,
      startedAt: first.created_at,
      endedAt: list[list.length - 1].created_at,
      pages: list.filter((e) => e.event === 'page_view').length,
      vehicles: [...new Set(vehicleOrder)],
      lastVehicle: vehicleOrder[vehicleOrder.length - 1] ?? null,
      outcome,
      reason: feedback ? String(feedback.meta?.reason ?? '') || null : null,
      comment: feedback && typeof feedback.meta?.comment === 'string' ? feedback.meta.comment : null,
    })
  }

  // Todos os dias do período aparecem, inclusive os sem visita.
  const days: { day: string; sessions: number }[] = []
  for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10)
    days.push({ day, sessions: daily.get(day) ?? 0 })
  }

  const sortDesc = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])

  return {
    totals: {
      sessions: reached.visit,
      visitors: visitors.size,
      bookings: reached.booking_created,
      conversion: pct(reached.booking_created, reached.visit),
      abandoned: reached.start_checkout - reached.booking_created,
      revenue,
    },
    funnel: FUNNEL_STEPS.map((s, i) => {
      const count = reached[s.key]
      const prev = i === 0 ? count : reached[FUNNEL_STEPS[i - 1].key]
      return { ...s, sessions: count, ofTotal: pct(count, reached.visit), ofPrevious: pct(count, prev) }
    }),
    days,
    devices: sortDesc(devices).map(([device, sessions]) => ({ device, sessions })),
    referrers: sortDesc(referrers).slice(0, 6).map(([source, sessions]) => ({ source, sessions })),
    reasons: sortDesc(reasons).map(([reason, count]) => ({
      reason,
      label: FEEDBACK_REASONS[reason as keyof typeof FEEDBACK_REASONS] ?? reason,
      count,
    })),
    vehicles: [...vehicles.entries()]
      .map(([vehicleId, v]) => ({ vehicleId, ...v, conversion: pct(v.bookings, v.views || v.checkouts) }))
      .sort((a, b) => b.views - a.views || b.checkouts - a.checkouts)
      .slice(0, 10),
    sessions: summaries.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
  }
}

export type AnalyticsSummary = ReturnType<typeof summarize>

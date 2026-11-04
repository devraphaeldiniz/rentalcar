import { describe, expect, it } from 'vitest'
import { brDay, summarize, type RawEvent } from '@/lib/analytics/summary'
import { deviceFrom, isBot, referrerHost } from '@/lib/analytics/server'

const ev = (session: string, event: RawEvent['event'], minute: number, extra: Partial<RawEvent> = {}): RawEvent => ({
  session_id: session,
  visitor_id: `v-${session}`,
  user_id: null,
  event,
  vehicle_id: null,
  device: 'desktop',
  meta: {},
  created_at: new Date(Date.UTC(2026, 10, 3, 15, minute)).toISOString(),
  ...extra,
})

describe('funil de conversão', () => {
  const events: RawEvent[] = [
    // a: só visitou
    ev('a', 'page_view', 0),
    // b: viu um carro, começou e desistiu por preço
    ev('b', 'page_view', 1),
    ev('b', 'view_vehicle', 2, { vehicle_id: 'car1' }),
    ev('b', 'start_checkout', 3, { vehicle_id: 'car1' }),
    ev('b', 'checkout_feedback', 4, { vehicle_id: 'car1', meta: { reason: 'preco', comment: 'mais barato na concorrência' } }),
    // c: reservou
    ev('c', 'page_view', 5, { device: 'mobile', referrer: 'google.com' }),
    ev('c', 'view_vehicle', 6, { vehicle_id: 'car1' }),
    ev('c', 'view_vehicle', 7, { vehicle_id: 'car1' }),
    ev('c', 'start_checkout', 8, { vehicle_id: 'car1' }),
    ev('c', 'booking_created', 9, { vehicle_id: 'car1', meta: { total: 499.6 } }),
    // d: resposta sem consentimento (sessão avulsa): conta o motivo, não a visita
    ev('d', 'checkout_feedback', 10, { visitor_id: null, meta: { reason: 'concorrencia' } }),
  ]
  const s = summarize(events, { from: '2026-11-01', to: '2026-11-03' })

  it('conta cada etapa por visita', () => {
    expect(s.funnel.map((f) => f.sessions)).toEqual([3, 2, 2, 1])
    expect(s.totals).toMatchObject({ sessions: 3, visitors: 3, bookings: 1, abandoned: 1, revenue: 499.6 })
    expect(s.totals.conversion).toBe(33.3)
  })

  it('agrupa os motivos de desistência, inclusive os anônimos', () => {
    expect(s.reasons.map((r) => [r.reason, r.count])).toEqual(expect.arrayContaining([['preco', 1], ['concorrencia', 1]]))
    expect(s.sessions.find((x) => x.sessionId === 'b')).toMatchObject({ outcome: 'desistiu_no_checkout', reason: 'preco' })
  })

  it('conta o carro uma vez por visita e calcula a conversão dele', () => {
    expect(s.vehicles[0]).toMatchObject({ vehicleId: 'car1', views: 2, checkouts: 2, bookings: 1, conversion: 50 })
  })

  it('preenche todos os dias do período, no fuso de Brasília', () => {
    expect(s.days).toEqual([
      { day: '2026-11-01', sessions: 0 },
      { day: '2026-11-02', sessions: 0 },
      { day: '2026-11-03', sessions: 3 },
    ])
    expect(brDay('2026-11-04T02:00:00Z')).toBe('2026-11-03')
  })

  it('registra origem e aparelho', () => {
    expect(s.referrers).toEqual(expect.arrayContaining([{ source: 'google.com', sessions: 1 }]))
    expect(s.devices).toEqual(expect.arrayContaining([{ device: 'mobile', sessions: 1 }]))
  })
})

describe('coleta', () => {
  it('reconhece robôs e o tipo de aparelho', () => {
    expect(isBot('Googlebot/2.1')).toBe(true)
    expect(isBot(null)).toBe(true)
    expect(deviceFrom('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Mobile')).toBe('mobile')
    expect(deviceFrom('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe('tablet')
    expect(deviceFrom('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop')
  })

  it('guarda só o domínio de origem externo', () => {
    expect(referrerHost('https://www.google.com/search?q=aluguel', 'astacar.app')).toBe('google.com')
    expect(referrerHost('https://astacar.app/vehicles/1', 'astacar.app')).toBeNull()
    expect(referrerHost('não é url', 'astacar.app')).toBeNull()
  })
})

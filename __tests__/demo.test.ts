import { describe, expect, it } from 'vitest'
import { DEMO_LIMITS, demoBookingProblem } from '@/lib/demo'

const base = { openBookings: 0, days: 3, startDate: '2026-11-10', today: '2026-11-06' }

describe('limites da conta de demonstração', () => {
  it('aceita uma reserva dentro dos limites', () => {
    expect(demoBookingProblem(base)).toBeNull()
  })
  it('recusa quando já há reservas abertas demais', () => {
    expect(demoBookingProblem({ ...base, openBookings: DEMO_LIMITS.openBookings })).toMatch(/até 2 reservas abertas/)
  })
  it('recusa períodos longos', () => {
    expect(demoBookingProblem({ ...base, days: DEMO_LIMITS.maxDays + 1 })).toMatch(/diárias/)
    expect(demoBookingProblem({ ...base, days: DEMO_LIMITS.maxDays })).toBeNull()
  })
  it('recusa retirada muito no futuro', () => {
    expect(demoBookingProblem({ ...base, startDate: '2027-01-06' })).toMatch(/próximos 60 dias/)
    expect(demoBookingProblem({ ...base, startDate: '2027-01-05' })).toBeNull()
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { adminFromStatuses, changeBookingStatus } from '@/lib/booking-status'

type Call = { query: string; variables: Record<string, unknown> }

/** Simula o Hasura: a primeira mutation é a troca de status; as seguintes, o cupom. */
function mockHasura(returning: { id: string; coupon_code: string | null }[]) {
  const calls: Call[] = []
  vi.stubEnv('NHOST_ADMIN_SECRET', 'segredo-de-teste')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body) as Call
      calls.push(body)
      const data = body.query.includes('update_bookings')
        ? { update_bookings: { returning } }
        : { update_coupons: { affected_rows: 1 } }
      return new Response(JSON.stringify({ data }), { status: 200 })
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('changeBookingStatus', () => {
  it('ao cancelar, devolve o uso do cupom', async () => {
    const calls = mockHasura([{ id: 'b1', coupon_code: 'VERAO10' }])
    const result = await changeBookingStatus('b1', 'cancelled', ['pending', 'confirmed'])
    expect(result).toEqual({ changed: true, coupon: 'VERAO10' })
    expect(calls).toHaveLength(2)
    expect(calls[0].variables).toMatchObject({ id: 'b1', from: ['pending', 'confirmed'], set: { status: 'cancelled' } })
    expect(calls[1].query).toContain('_inc: { uses: -1 }')
    expect(calls[1].variables).toEqual({ code: 'VERAO10' })
  })

  it('não devolve o cupom se a reserva já tinha mudado (clique duplo)', async () => {
    const calls = mockHasura([])
    const result = await changeBookingStatus('b1', 'cancelled', ['pending', 'confirmed'])
    expect(result.changed).toBe(false)
    expect(calls).toHaveLength(1)
  })

  it('não mexe no cupom quando a reserva é aprovada', async () => {
    const calls = mockHasura([{ id: 'b1', coupon_code: 'VERAO10' }])
    await changeBookingStatus('b1', 'confirmed', ['pending'])
    expect(calls).toHaveLength(1)
  })

  it('grava campos extras junto com o status', async () => {
    const calls = mockHasura([{ id: 'b1', coupon_code: null }])
    await changeBookingStatus('b1', 'cancelled', ['confirmed'], { payment_status: 'refunded' })
    expect(calls[0].variables.set).toEqual({ payment_status: 'refunded', status: 'cancelled' })
  })
})

describe('adminFromStatuses', () => {
  it('nunca reabre reserva cancelada', () => {
    expect(adminFromStatuses('confirmed')).toEqual(['pending', 'active', 'completed'])
    expect(adminFromStatuses('cancelled')).toEqual(['pending', 'confirmed', 'active', 'completed'])
  })
})

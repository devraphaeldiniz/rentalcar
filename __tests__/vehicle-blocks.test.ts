import { describe, expect, it } from 'vitest'
import { blockInput, overlaps } from '@/lib/vehicle-blocks'

const vid = '123e4567-e89b-12d3-a456-426614174000'

describe('bloqueio de carro', () => {
  it('períodos [início, fim) se cruzam só quando dividem um dia', () => {
    expect(overlaps('2026-11-10', '2026-11-12', '2026-11-11', '2026-11-13')).toBe(true)
    expect(overlaps('2026-11-10', '2026-11-12', '2026-11-12', '2026-11-14')).toBe(false)
  })

  it('valida as datas e o motivo', () => {
    expect(blockInput.safeParse({ vehicle_id: vid, start_date: '2026-11-10', end_date: '2026-11-12' }).data?.reason).toBe('maintenance')
    expect(blockInput.safeParse({ vehicle_id: vid, start_date: '2026-11-12', end_date: '2026-11-12' }).success).toBe(false)
    expect(blockInput.safeParse({ vehicle_id: vid, start_date: '2026-11-10', end_date: '2026-11-12', reason: 'ferias' }).success).toBe(false)
    expect(blockInput.safeParse({ vehicle_id: vid, start_date: '2026-11-10', end_date: '2027-06-01' }).success).toBe(false)
  })

  it('observação vazia vira null', () => {
    expect(blockInput.parse({ vehicle_id: vid, start_date: '2026-11-10', end_date: '2026-11-12', notes: '  ' }).notes).toBeNull()
  })
})

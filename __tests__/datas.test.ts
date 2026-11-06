import { describe, expect, it } from 'vitest'
import { isPastDate, pickupStarted } from '@/lib/rental'

// 5/11 às 22h em Brasília = 6/11 01h em UTC (horário em que o servidor já "virava o dia").
const lateNight = new Date('2026-11-06T01:00:00Z')

describe('cancelamento no fuso de Brasília', () => {
  it('às 22h a retirada de amanhã ainda pode ser cancelada', () => {
    expect(pickupStarted('2026-11-06', lateNight)).toBe(false)
  })
  it('retirada de hoje já não pode', () => {
    expect(pickupStarted('2026-11-05', lateNight)).toBe(true)
  })
})

describe('data de retirada no passado', () => {
  it('hoje à noite ainda aceita reserva para hoje', () => {
    expect(isPastDate('2026-11-05', lateNight)).toBe(false)
  })
  it('ontem é passado', () => {
    expect(isPastDate('2026-11-04', lateNight)).toBe(true)
  })
})

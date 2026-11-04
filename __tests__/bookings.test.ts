import { describe, it, expect } from 'vitest'
import { bookingSchema } from '@/lib/validations/booking'

describe('Booking Validation', () => {
  it('should validate correct booking', () => {
    const booking = {
      vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2025-12-01',
      end_date: '2025-12-05',
      customer_name: 'Maria Silva',
      customer_email: 'maria@example.com',
      customer_phone: '11999999999',
      customer_cpf: '12345678901',
    }
    expect(() => bookingSchema.parse(booking)).not.toThrow()
  })

  it('should reject invalid dates', () => {
    const booking = {
      vehicle_id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2025-12-05',
      end_date: '2025-12-01',
    }
    expect(() => bookingSchema.parse(booking)).toThrow()
  })
})
describe('data de hoje', () => {
  it('usa o fuso de Brasília mesmo com o servidor em UTC', async () => {
    const { todayIso } = await import('@/lib/rental')
    // 3/11 às 21h30 em Brasília = 4/11 00h30 em UTC
    expect(todayIso(new Date('2026-11-04T00:30:00Z'))).toBe('2026-11-03')
    expect(todayIso(new Date('2026-11-04T03:00:00Z'))).toBe('2026-11-04')
  })
})

import { z } from 'zod'
import { isIsoDate, MAX_RENTAL_DAYS, rentalDays } from '@/lib/rental'

export const BLOCK_REASONS = {
  maintenance: 'Manutenção',
  inspection: 'Revisão',
  cleaning: 'Higienização',
  other: 'Outro motivo',
} as const

export type BlockReason = keyof typeof BLOCK_REASONS

export type VehicleBlock = {
  id: string
  vehicle_id: string
  start_date: string
  end_date: string
  reason: BlockReason
  notes: string | null
  created_at: string
}

/** Período no mesmo formato das reservas: o carro volta a ficar livre em end_date. */
export const blockInput = z
  .object({
    vehicle_id: z.string().uuid(),
    start_date: z.string().refine(isIsoDate, 'Data inicial inválida'),
    end_date: z.string().refine(isIsoDate, 'Data final inválida'),
    reason: z.enum(['maintenance', 'inspection', 'cleaning', 'other']).default('maintenance'),
    notes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || null),
  })
  .refine((b) => b.end_date > b.start_date, { message: 'O carro precisa voltar depois do início do bloqueio.', path: ['end_date'] })
  .refine((b) => rentalDays(b.start_date, b.end_date) <= MAX_RENTAL_DAYS, { message: `Bloqueio de até ${MAX_RENTAL_DAYS} dias.`, path: ['end_date'] })

/** Os dois períodos [a, b) se cruzam? */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && bStart < aEnd

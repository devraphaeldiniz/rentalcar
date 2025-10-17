import { z } from 'zod'

export const bookingSchema = z.object({
  vehicle_id: z.string().uuid(),
  start_date: z.string().refine((date) => new Date(date) >= new Date(), {
    message: 'Data inicial deve ser futura',
  }),
  end_date: z.string(),
  notes: z.string().optional(),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: 'Data final deve ser após data inicial',
  path: ['end_date'],
})

export type BookingInput = z.infer<typeof bookingSchema>
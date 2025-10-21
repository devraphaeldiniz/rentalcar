import { z } from 'zod'

export const bookingSchema = z.object({
  vehicle_id: z.string().uuid(),
  start_date: z.string(),
  end_date: z.string(),
  customer_name: z.string().min(3),
  customer_email: z.string().email(),
  customer_phone: z.string().min(10),
  customer_cpf: z.string().min(11),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: 'Data final deve ser após data inicial',
  path: ['end_date'],
})

export type BookingInput = z.infer<typeof bookingSchema>
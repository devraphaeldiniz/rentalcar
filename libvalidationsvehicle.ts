import { z } from 'zod'

export const vehicleSchema = z.object({
  brand: z.string().min(2, 'Marca obrigatória'),
  model: z.string().min(2, 'Modelo obrigatório'),
  year: z.number().min(2000).max(new Date().getFullYear() + 1),
  plate: z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Placa inválida'),
  category: z.enum(['economy', 'standard', 'suv', 'luxury']),
  daily_rate: z.number().positive('Taxa diária deve ser positiva'),
  status: z.enum(['available', 'rented', 'maintenance']).default('available'),
  image_url: z.string().url().optional(),
  features: z.array(z.string()).default([]),
})

export type VehicleInput = z.infer<typeof vehicleSchema>
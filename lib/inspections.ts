import { z } from 'zod'

// Vistoria na retirada e na devolução. Funções puras: usadas pela API, pelo painel e pela área do cliente.

export type InspectionKind = 'pickup' | 'return'

export type Damage = { area: string; description: string }
export type ExtraCharge = { label: string; amount: number }

export type Inspection = {
  id: string
  booking_id: string
  kind: InspectionKind
  odometer_km: number
  fuel_eighths: number
  damages: Damage[]
  extra_charges: ExtraCharge[]
  extra_total: number | string
  notes: string | null
  created_at: string
}

export const KIND_LABEL: Record<InspectionKind, string> = { pickup: 'Retirada', return: 'Devolução' }

/** Valor sugerido por oitavo de tanque que faltar na devolução (≈ 6 litros). O admin pode mudar. */
export const FUEL_PRICE_PER_EIGHTH = 39

export const DAMAGE_AREAS = [
  'Para-choque dianteiro',
  'Para-choque traseiro',
  'Capô',
  'Teto',
  'Porta-malas',
  'Lateral esquerda',
  'Lateral direita',
  'Rodas e pneus',
  'Vidros e retrovisores',
  'Interior',
] as const

export const fuelLabel = (eighths: number) => (eighths === 8 ? 'Tanque cheio' : eighths === 0 ? 'Reserva' : `${eighths}/8 do tanque`)

const money = (v: number) => Math.round(v * 100) / 100

export const inspectionInput = z.object({
  kind: z.enum(['pickup', 'return']),
  odometer_km: z.coerce.number().int('Quilometragem sem casas decimais').min(0).max(1_999_999),
  fuel_eighths: z.coerce.number().int().min(0).max(8),
  damages: z
    .array(z.object({ area: z.string().trim().min(1).max(60), description: z.string().trim().min(1, 'Descreva a avaria').max(200) }))
    .max(20)
    .default([]),
  extra_charges: z
    .array(z.object({ label: z.string().trim().min(1, 'Diga o que está sendo cobrado').max(80), amount: z.coerce.number().positive().max(100_000) }))
    .max(10)
    .default([]),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => v || null),
})

export type InspectionInput = z.infer<typeof inspectionInput>

export const extraTotal = (charges: ExtraCharge[]) => money(charges.reduce((sum, c) => sum + Number(c.amount), 0))

/** Status em que cada vistoria pode ser feita e para onde ela leva a reserva. */
export const INSPECTION_FLOW: Record<InspectionKind, { from: string[]; to: string }> = {
  pickup: { from: ['confirmed'], to: 'active' },
  return: { from: ['active'], to: 'completed' },
}

/** Comparação entre retirada e devolução, com a cobrança de combustível sugerida. */
export function compareInspections(pickup: Pick<Inspection, 'odometer_km' | 'fuel_eighths' | 'damages'>, ret: Pick<Inspection, 'odometer_km' | 'fuel_eighths' | 'damages'>) {
  const missingEighths = Math.max(0, pickup.fuel_eighths - ret.fuel_eighths)
  const before = new Set(pickup.damages.map((d) => `${d.area}|${d.description}`.toLowerCase()))
  return {
    km: Math.max(0, ret.odometer_km - pickup.odometer_km),
    missingEighths,
    suggestedFuelCharge: money(missingEighths * FUEL_PRICE_PER_EIGHTH),
    // Avarias que não estavam na retirada.
    newDamages: ret.damages.filter((d) => !before.has(`${d.area}|${d.description}`.toLowerCase())),
  }
}

/** Mensagem de erro amigável para os erros do banco. */
export function inspectionDbError(message: string): string | null {
  if (message.includes('inspection_without_pickup')) return 'Faça a vistoria de retirada antes da devolução.'
  if (message.includes('inspection_km_lower')) return 'A quilometragem da devolução não pode ser menor que a da retirada.'
  if (message.includes('booking_inspections_one_per_kind') || message.includes('Uniqueness')) return 'Essa vistoria já foi registrada.'
  return null
}

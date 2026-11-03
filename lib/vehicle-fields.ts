// Campos de veículo que o painel admin pode gravar. Qualquer outro campo
// enviado (id, nota média, créditos das fotos...) é descartado.
export const EDITABLE_VEHICLE_FIELDS = [
  'brand', 'model', 'year', 'plate', 'category', 'daily_rate', 'status', 'description', 'transmission',
  'fuel_type', 'passengers', 'doors', 'trunk_capacity', 'air_conditioning', 'color', 'features', 'images', 'image_url',
] as const

export function pickVehicleFields(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {}
  return Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => (EDITABLE_VEHICLE_FIELDS as readonly string[]).includes(k)),
  )
}

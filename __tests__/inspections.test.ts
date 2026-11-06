import { describe, expect, it } from 'vitest'
import { compareInspections, extraTotal, fuelLabel, INSPECTION_FLOW, inspectionDbError, inspectionInput } from '@/lib/inspections'

describe('vistoria', () => {
  it('compara retirada e devolução e sugere a cobrança de combustível', () => {
    const pickup = { odometer_km: 12000, fuel_eighths: 8, damages: [{ area: 'Capô', description: 'risco' }] }
    const ret = { odometer_km: 12480, fuel_eighths: 6, damages: [{ area: 'Capô', description: 'Risco' }, { area: 'Teto', description: 'amassado' }] }
    expect(compareInspections(pickup, ret)).toEqual({
      km: 480,
      missingEighths: 2,
      suggestedFuelCharge: 78,
      newDamages: [{ area: 'Teto', description: 'amassado' }],
    })
  })

  it('tanque mais cheio na devolução não gera cobrança', () => {
    expect(compareInspections({ odometer_km: 1, fuel_eighths: 4, damages: [] }, { odometer_km: 2, fuel_eighths: 8, damages: [] }).suggestedFuelCharge).toBe(0)
  })

  it('valida a entrada e soma as cobranças', () => {
    const ok = inspectionInput.parse({ kind: 'return', odometer_km: '12480', fuel_eighths: '6', extra_charges: [{ label: 'Lavagem', amount: '35.5' }, { label: 'Combustível', amount: 78 }] })
    expect(ok.odometer_km).toBe(12480)
    expect(extraTotal(ok.extra_charges)).toBe(113.5)
    expect(inspectionInput.safeParse({ kind: 'pickup', odometer_km: 10, fuel_eighths: 9 }).success).toBe(false)
    expect(inspectionInput.safeParse({ kind: 'pickup', odometer_km: 10.5, fuel_eighths: 8 }).success).toBe(false)
  })

  it('fluxo de status e mensagens do banco', () => {
    expect(INSPECTION_FLOW.pickup).toEqual({ from: ['confirmed'], to: 'active' })
    expect(INSPECTION_FLOW.return).toEqual({ from: ['active'], to: 'completed' })
    expect(inspectionDbError('inspection_km_lower: ...')).toMatch(/menor/)
    expect(inspectionDbError('outra coisa')).toBeNull()
    expect(fuelLabel(8)).toBe('Tanque cheio')
    expect(fuelLabel(3)).toBe('3/8 do tanque')
  })
})

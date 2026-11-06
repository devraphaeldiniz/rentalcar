import { describe, expect, it } from 'vitest'
import { periodWhere, revenueByVehicle } from '@/lib/reports/where'
import { vehicleDbError } from '@/lib/vehicles-server'
import { profileInput } from '@/lib/profile-input'

describe('relatórios', () => {
  it('soma a receita como número, mesmo quando o banco devolve texto', () => {
    const fiat = { id: 'v1', brand: 'Fiat', model: 'Pulse' }
    const kwid = { id: 'v2', brand: 'Renault', model: 'Kwid' }
    expect(
      revenueByVehicle([
        { total_amount: '100.10', vehicle: fiat },
        { total_amount: '50.20', vehicle: fiat },
        { total_amount: 300, vehicle: kwid },
        { total_amount: 10, vehicle: null },
      ]),
    ).toEqual([
      { brand: 'Renault', model: 'Kwid', bookings: 1, revenue: 300 },
      { brand: 'Fiat', model: 'Pulse', bookings: 2, revenue: 150.3 },
    ])
  })

  it('filtro de período ignora datas inválidas ou invertidas', () => {
    expect(periodWhere('2026-11-01', '2026-11-30')).toEqual({ start_date: { _gte: '2026-11-01' }, end_date: { _lte: '2026-11-30' } })
    expect(periodWhere('2026-11-30', '2026-11-01')).toEqual({})
    expect(periodWhere('ontem', '2026-11-01')).toEqual({})
    expect(periodWhere(null, null)).toEqual({})
  })
})

describe('mensagens de erro do banco', () => {
  it('placa repetida', () => {
    expect(vehicleDbError(new Error('Uniqueness violation. duplicate key value violates unique constraint "vehicles_plate_key"'))).toBe('Já existe um carro com essa placa.')
    expect(vehicleDbError(new Error('timeout'))).toBeNull()
  })
})

describe('perfil editado pelo admin', () => {
  it('usa a mesma validação do cliente', () => {
    expect(profileInput.parse({ fullName: 'Ana Lima', phone: '(31) 99999-8888', cpf: '529.982.247-25' })).toEqual({ fullName: 'Ana Lima', phone: '31999998888', cpf: '52998224725' })
    expect(profileInput.safeParse({ fullName: 'Ana Lima', cpf: '111.111.111-11' }).success).toBe(false)
    expect(profileInput.safeParse({ fullName: 'A' }).success).toBe(false)
  })
})

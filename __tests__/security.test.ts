import { describe, it, expect } from 'vitest'
import { safeRedirect } from '@/lib/safe-redirect'
import { isIsoDate, isValidCpf, parseRange, rentalDays } from '@/lib/rental'
import { pickVehicleFields } from '@/lib/vehicle-fields'

describe('safeRedirect (redirecionamento aberto)', () => {
  it.each([
    ['//evil.com'],
    ['/\\evil.com'],
    ['/\\/evil.com'],
    ['https://evil.com'],
    ['javascript:alert(1)'],
    ['/\n/evil.com'],
    [''],
    [null],
  ])('recusa %s', (target) => {
    expect(safeRedirect(target as string)).toBe('/')
  })

  it('caracteres codificados continuam sendo caminho interno', () => {
    expect(safeRedirect('/%0d%0aSet-Cookie:x')).toBe('/%0d%0aSet-Cookie:x')
  })

  it('mantém caminhos internos com query e hash', () => {
    expect(safeRedirect('/vehicles/abc/checkout?retirada=2027-01-05#x')).toBe('/vehicles/abc/checkout?retirada=2027-01-05#x')
  })
})

describe('datas de reserva', () => {
  it('recusa datas que não existem no calendário', () => {
    expect(isIsoDate('2027-02-30')).toBe(false)
    expect(isIsoDate('2027-04-31')).toBe(false)
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate("2027-01-01' OR '1'='1")).toBe(false)
  })

  it('valida o período da busca', () => {
    expect(parseRange('2027-01-10', '2027-01-05', '2026-01-01')).toBeNull()
    expect(parseRange('2020-01-10', '2020-01-12', '2026-01-01')).toBeNull()
    expect(parseRange('2027-01-01', '2027-06-01', '2026-01-01')).toBeNull()
    expect(parseRange('2027-01-01', '2027-01-04', '2026-01-01')).toEqual({ start: '2027-01-01', end: '2027-01-04', days: 3 })
    expect(rentalDays('2027-01-01', '2027-01-02')).toBe(1)
  })
})

describe('CPF', () => {
  it('aceita CPF com dígitos verificadores corretos, com ou sem máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
  })
  it('recusa CPF inválido', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('123.456.789-00')).toBe(false)
    expect(isValidCpf('123')).toBe(false)
  })
})

describe('campos de veículo (atribuição em massa)', () => {
  it('descarta campos que o painel não pode gravar', () => {
    const picked = pickVehicleFields({ brand: 'Fiat', daily_rate: 100, id: 'x', average_rating: 5, image_credits: [] })
    expect(picked).toEqual({ brand: 'Fiat', daily_rate: 100 })
  })
})

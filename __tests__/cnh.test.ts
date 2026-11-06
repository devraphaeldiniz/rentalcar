import { describe, expect, it } from 'vitest'
import { cnhInput, cnhProblems, isValidCnh } from '@/lib/cnh'

const ok = { cnh_number: '02536587035', cnh_category: 'B', cnh_expires_on: '2030-05-01', cnh_first_issued_on: '2015-03-10' }

describe('CNH', () => {
  it('confere os dígitos verificadores', () => {
    expect(isValidCnh('02536587035')).toBe(true)
    expect(isValidCnh('025.365.870-35')).toBe(true)
    expect(isValidCnh('02536587036')).toBe(false)
    expect(isValidCnh('11111111111')).toBe(false)
    expect(isValidCnh('123')).toBe(false)
  })

  it('CNH em dia serve para a retirada', () => {
    expect(cnhProblems(ok, '2026-12-01')).toEqual([])
  })

  it('sem CNH, vencida, de moto ou recente demais não serve', () => {
    expect(cnhProblems(null, '2026-12-01')).toEqual(['Cadastre sua CNH para reservar.'])
    expect(cnhProblems({ ...ok, cnh_expires_on: '2026-11-30' }, '2026-12-01')[0]).toMatch(/vence antes da retirada/)
    expect(cnhProblems({ ...ok, cnh_category: 'A' }, '2026-12-01')[0]).toMatch(/categoria B/)
    expect(cnhProblems({ ...ok, cnh_first_issued_on: '2024-12-02' }, '2026-12-01')[0]).toMatch(/2 anos/)
    expect(cnhProblems({ ...ok, cnh_first_issued_on: '2024-12-01' }, '2026-12-01')).toEqual([])
  })

  it('formulário limpa a máscara e recusa datas trocadas', () => {
    expect(cnhInput.parse({ ...ok, cnh_number: '025.365.870-35' }).cnh_number).toBe('02536587035')
    expect(cnhInput.safeParse({ ...ok, cnh_first_issued_on: '2031-01-01' }).success).toBe(false)
  })
})

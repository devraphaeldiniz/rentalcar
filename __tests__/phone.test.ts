import { describe, expect, it } from 'vitest'
import { formatPhone, whatsappUrl } from '@/lib/phone'

describe('formatPhone', () => {
  it('formata celular e fixo com DDD', () => {
    expect(formatPhone('31994402252')).toBe('(31) 99440-2252')
    expect(formatPhone('3133334444')).toBe('(31) 3333-4444')
    expect(formatPhone('5531994402252')).toBe('(31) 99440-2252')
  })
  it('devolve vazio sem número', () => {
    expect(formatPhone(null)).toBe('')
  })
})

describe('whatsappUrl', () => {
  it('acrescenta o 55 e codifica a mensagem', () => {
    expect(whatsappUrl('(31) 99440-2252', 'Olá, tudo bem?')).toBe('https://wa.me/5531994402252?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })
  it('recusa número incompleto', () => {
    expect(whatsappUrl('12345')).toBeNull()
    expect(whatsappUrl(undefined)).toBeNull()
  })
})

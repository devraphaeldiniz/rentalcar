import { describe, expect, it } from 'vitest'
import { HIDDEN_TEXT, maskEmail, maskName, maskPersonalData, maskText } from '@/lib/demo-admin'

describe('mascarar dados pessoais no painel de demonstração', () => {
  it('e-mail, nome e telefone', () => {
    expect(maskEmail('maria.souza@gmail.com')).toBe('m•••@•••.com')
    expect(maskName('maria souza')).toBe('M•••• S••••')
    expect(maskText('ligar para (31) 99440-2252 hoje')).toBe('ligar para (••) •••••-••52 hoje')
  })

  it('procura dados soltos em textos (metadados da auditoria)', () => {
    expect(maskText('login de ana@astacar.dev pelo IP 189.40.12.7, CPF 123.456.789-09')).toBe(
      'login de a•••@•••.dev pelo IP •••.•••.•••.•••, CPF •••.•••.•••-••',
    )
  })

  it('mascara a reserva inteira sem mexer em ids, datas, valores e no carro', () => {
    const booking = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      start_date: '2026-11-10',
      total_amount: 450.5,
      customer_name: 'João Pereira',
      customer_email: 'joao@empresa.com.br',
      user: { id: 'u1', email: 'joao@empresa.com.br', displayName: 'João Pereira', avatarUrl: 'https://x/y.png' },
      profile: { phone: '31994402252', cpf: '12345678909' },
      vehicle: { brand: 'Fiat', model: 'Pulse', plate: 'RTA1B23' },
      price_lines: [{ kind: 'protection', code: 'basica', label: 'Proteção básica', amount: 0 }],
      extras: [{ name: 'Cadeirinha', price: 15 }],
    }
    const masked = maskPersonalData(booking)
    expect(masked).toEqual({
      ...booking,
      customer_name: 'J•••• P••••',
      customer_email: 'j•••@•••.br',
      user: { id: 'u1', email: 'j•••@•••.br', displayName: 'J•••• P••••', avatarUrl: null },
      profile: { phone: '(••) •••••-••52', cpf: '•••.•••.•••-••' },
    })
    expect(booking.customer_name).toBe('João Pereira')
  })

  it('esconde o texto das mensagens de contato', () => {
    const [msg] = maskPersonalData([{ name: 'Ana Lima', email: 'ana@x.com', subject: 'Dúvida', message: 'Meu CPF é ...' }])
    expect(msg).toEqual({ name: 'A•••• L••••', email: 'a•••@•••.com', subject: 'Dúvida', message: HIDDEN_TEXT })
  })
})

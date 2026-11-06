import { describe, expect, it } from 'vitest'
import { bookingMessage, hideFloatingButton, messageForPage, storeWhatsappLink } from '@/lib/whatsapp'

describe('WhatsApp do atendimento', () => {
  it('monta o link com a mensagem', () => {
    expect(storeWhatsappLink('Olá!', '5531999998888')).toBe('https://wa.me/5531999998888?text=Ol%C3%A1!')
    expect(storeWhatsappLink('Olá!', null)).toBeNull()
  })

  it('mensagem conforme a página', () => {
    expect(messageForPage('/vehicles/123e4567-e89b-12d3-a456-426614174000', 'https://astacar.dev')).toBe(
      'Olá! Tenho uma dúvida sobre este carro: https://astacar.dev/vehicles/123e4567-e89b-12d3-a456-426614174000',
    )
    expect(messageForPage('/', 'x')).toMatch(/Vim pelo site/)
    expect(bookingMessage('ASTA-1234ABCD', 'Fiat Pulse')).toBe('Olá! Sou cliente da AstaCar e queria falar sobre a reserva ASTA-1234ABCD (Fiat Pulse).')
  })

  it('some no painel, no login, no checkout e no pagamento', () => {
    expect(hideFloatingButton('/admin/agenda')).toBe(true)
    expect(hideFloatingButton('/vehicles/abc/checkout')).toBe(true)
    expect(hideFloatingButton('/bookings/abc/pagamento')).toBe(true)
    expect(hideFloatingButton('/auth/signin')).toBe(true)
    expect(hideFloatingButton('/vehicles/abc')).toBe(false)
  })
})

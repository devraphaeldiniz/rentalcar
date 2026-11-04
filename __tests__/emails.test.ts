import { describe, expect, it } from 'vitest'
import { reminderTargetDate } from '@/lib/email/booking-emails'
import { bookingCode, confirmationEmail, escapeHtml, reminderEmail, type EmailBooking } from '@/lib/email/templates'

const booking: EmailBooking = {
  id: 'e0fd7743-1111-2222-3333-444455556666',
  start_date: '2026-11-04',
  end_date: '2026-11-07',
  total_amount: '869.73',
  customer_name: 'Raphael Diniz',
  customer_email: 'cliente@exemplo.com',
  payment_method: 'online',
  payment_status: 'paid',
  vehicle: { brand: 'Chevrolet', model: 'Onix Plus' },
}

describe('e-mails da reserva', () => {
  it('confirmação de reserva paga online', () => {
    const m = confirmationEmail(booking)
    expect(m.subject).toBe('Reserva confirmada · Chevrolet Onix Plus · ASTA-E0FD7743')
    expect(m.html).toContain('Pagamento aprovado')
    expect(m.text).toContain('Pago online pelo Mercado Pago')
    expect(m.text).toContain('3 diárias')
    expect(m.text).toContain('/bookings/e0fd7743-1111-2222-3333-444455556666/confirmation')
  })

  it('confirmação com pagamento na retirada', () => {
    const m = confirmationEmail({ ...booking, payment_method: 'on_pickup', payment_status: 'pending' })
    expect(m.subject.startsWith('Reserva registrada')).toBe(true)
    expect(m.text).toContain('Pagamento na retirada')
  })

  it('lembrete da véspera', () => {
    const m = reminderEmail(booking)
    expect(m.subject).toContain('Lembrete: retirada amanhã')
    expect(m.text).toContain('Leve na retirada')
  })

  it('escapa HTML vindo do cadastro do cliente', () => {
    const m = confirmationEmail({ ...booking, customer_name: '<script>x</script>' })
    expect(m.html).not.toContain('<script>x')
    expect(escapeHtml('"a" & <b>')).toBe('&quot;a&quot; &amp; &lt;b&gt;')
  })

  it('código da reserva', () => {
    expect(bookingCode(booking.id)).toBe('ASTA-E0FD7743')
  })
})

describe('reminderTargetDate (fuso de Brasília)', () => {
  it('às 18h de Brasília (21h UTC) o alvo é o dia seguinte', () => {
    expect(reminderTargetDate(new Date('2026-11-03T21:00:00Z'))).toBe('2026-11-04')
  })
  it('perto da meia-noite UTC ainda usa o dia de Brasília', () => {
    expect(reminderTargetDate(new Date('2026-11-04T02:30:00Z'))).toBe('2026-11-04')
  })
})

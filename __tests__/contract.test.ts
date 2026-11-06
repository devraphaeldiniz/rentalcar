import { describe, expect, it } from 'vitest'
import { buildContractPdf, type ContractData, contractCode } from '@/lib/contract'

const booking: ContractData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  start_date: '2026-11-20',
  end_date: '2026-11-24',
  total_amount: 523.6,
  status: 'confirmed',
  payment_status: 'pending',
  payment_method: 'on_pickup',
  price_lines: [
    { kind: 'base', code: 'diarias', label: '4 diárias', detail: '4 × R$ 120,00', amount: 480 },
    { kind: 'discount', code: 'VERAO10', label: 'Cupom VERAO10', detail: '10% sobre as diárias', amount: -48 },
    { kind: 'protection', code: 'completa', label: 'Proteção completa', detail: '4 × R$ 22,90', amount: 91.6 },
  ],
  coupon_code: 'VERAO10',
  terms_accepted_at: '2026-11-06T15:00:00Z',
  created_at: '2026-11-06T15:00:00Z',
  customer_name: 'Maria Souza',
  customer_email: 'maria@exemplo.com',
  vehicle: { brand: 'Fiat', model: 'Pulse', year: 2024, plate: 'RTA1B23', color: 'Prata', category: 'suv' },
  profile: { full_name: 'Maria Souza', phone: '31994402252', cpf: '12345678909' },
}

describe('contrato em PDF', () => {
  it('código curto da reserva', () => {
    expect(contractCode(booking.id)).toBe('ASTA-123E4567')
  })

  it('gera um PDF com os dados da reserva', () => {
    const doc = buildContractPdf(booking, new Date('2026-11-06T18:00:00Z'))
    const raw = doc.output()
    expect(raw.startsWith('%PDF-')).toBe(true)
    for (const text of ['ASTA-123E4567', 'Maria Souza', '123.456.789-09', 'Fiat Pulse 2024', 'RTA1B23', 'Cupom VERAO10', 'sem valor legal']) {
      expect(raw, text).toContain(text)
    }
  })

  it('reserva cancelada ganha o aviso', () => {
    const raw = buildContractPdf({ ...booking, status: 'cancelled' }).output()
    expect(raw).toContain('RESERVA CANCELADA')
  })

  it('funciona sem linhas de preço nem perfil (reservas antigas)', () => {
    const raw = buildContractPdf({ ...booking, price_lines: null, profile: null, vehicle: null }).output()
    expect(raw).toContain('removido da frota')
  })
})

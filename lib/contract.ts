import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { PriceLine } from '@/lib/pricing'
import { POLICIES, REQUIREMENTS, TERMS_VERSION } from '@/lib/policies'
import { BOOKING_STATUS, CATEGORY_LABELS, formatBRL, formatLongDate, pluralDays, rentalDays } from '@/lib/rental'

export type ContractData = {
  id: string
  start_date: string
  end_date: string
  total_amount: number | string
  status: string
  payment_status: string | null
  payment_method: string | null
  price_lines: PriceLine[] | null
  coupon_code: string | null
  terms_accepted_at: string | null
  created_at: string
  customer_name: string | null
  customer_email: string | null
  vehicle: { brand: string; model: string; year: number; plate: string | null; color: string | null; category: string } | null
  profile: { full_name: string | null; phone: string | null; cpf: string | null } | null
}

export const contractCode = (id: string) => `ASTA-${id.slice(0, 8).toUpperCase()}`

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))

const cpf = (v: string | null | undefined) => {
  const d = (v ?? '').replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : 'não informado'
}

const phone = (v: string | null | undefined) => {
  const d = (v ?? '').replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return 'não informado'
}

const paymentLabel = (method: string | null, status: string | null) => {
  const how = method === 'online' ? 'Online (Mercado Pago)' : 'Na retirada'
  const state = status === 'paid' ? 'pago' : status === 'refunded' ? 'estornado' : 'a pagar'
  return `${how}, ${state}`
}

// Cores da marca (RGB).
const BRAND: [number, number, number] = [10, 91, 255]
const INK: [number, number, number] = [15, 23, 42]
const MUTED: [number, number, number] = [100, 116, 139]

/**
 * Contrato de locação da reserva em PDF (A4). Usa as linhas de preço gravadas na própria
 * reserva, então o documento mostra exatamente o que foi aceito no checkout.
 * Fontes padrão do PDF (Helvetica): cobrem os acentos do português.
 */
export function buildContractPdf(b: ContractData, now: Date = new Date()): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 16
  let y = 0

  const ensure = (space: number) => {
    if (y + space > H - 15) {
      doc.addPage()
      y = M
    }
  }
  const heading = (text: string) => {
    ensure(14)
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...BRAND)
    doc.text(text.toUpperCase(), M, y)
    doc.setDrawColor(...BRAND).setLineWidth(0.3).line(M, y + 1.5, W - M, y + 1.5)
    y += 6.2
  }
  const pairs = (rows: [string, string][]) => {
    for (const [label, value] of rows) {
      const lines = doc.setFont('helvetica', 'normal').setFontSize(10).splitTextToSize(value, W - M * 2 - 42) as string[]
      ensure(lines.length * 4.6 + 0.8)
      doc.setFont('helvetica', 'bold').setTextColor(...MUTED).text(label, M, y)
      doc.setFont('helvetica', 'normal').setTextColor(...INK).text(lines, M + 42, y)
      y += lines.length * 4.6 + 0.8
    }
    y += 1.5
  }

  // Cabeçalho
  doc.setFillColor(...BRAND).rect(0, 0, W, 26, 'F')
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'bold').setFontSize(18).text('AstaCar', M, 12)
  doc.setFont('helvetica', 'normal').setFontSize(9).text('Rent & Freedom', M, 18)
  doc.setFont('helvetica', 'bold').setFontSize(12).text('Contrato de locação de veículo', W - M, 12, { align: 'right' })
  doc.setFont('helvetica', 'normal').setFontSize(9).text(`${contractCode(b.id)}  ·  emitido em ${dateTime(now.toISOString())}`, W - M, 18, { align: 'right' })
  y = 34

  if (b.status === 'cancelled') {
    doc.setFillColor(254, 226, 226).roundedRect(M, y - 5, W - M * 2, 10, 2, 2, 'F')
    doc.setTextColor(185, 28, 28).setFont('helvetica', 'bold').setFontSize(10).text('RESERVA CANCELADA: este contrato não tem mais efeito.', M + 4, y + 1.5)
    y += 12
  }

  heading('Partes')
  pairs([
    ['Locadora', 'AstaCar Locação de Veículos (projeto de demonstração)'],
    ['Locatário', b.profile?.full_name || b.customer_name || 'não informado'],
    ['CPF', cpf(b.profile?.cpf)],
    ['E-mail', b.customer_email || 'não informado'],
    ['Telefone', phone(b.profile?.phone)],
  ])

  heading('Veículo')
  const v = b.vehicle
  pairs([
    ['Carro', v ? `${v.brand} ${v.model} ${v.year}` : 'removido da frota'],
    ['Categoria', v ? (CATEGORY_LABELS[v.category] ?? v.category) : '-'],
    ['Placa', v?.plate || 'informada na retirada'],
    ['Cor', v?.color || '-'],
  ])

  const days = rentalDays(b.start_date, b.end_date)
  heading('Período')
  pairs([
    ['Retirada', formatLongDate(b.start_date)],
    ['Devolução', formatLongDate(b.end_date)],
    ['Duração', pluralDays(days)],
    ['Situação', BOOKING_STATUS[b.status]?.label ?? b.status],
  ])

  heading('Valores')
  const lines = b.price_lines?.length ? b.price_lines : [{ kind: 'base', code: 'total', label: pluralDays(days), detail: '', amount: Number(b.total_amount) } as PriceLine]
  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [['Item', 'Detalhe', 'Valor']],
    body: lines.map((l) => [l.label, l.detail, l.amount < 0 ? `- ${formatBRL(-l.amount)}` : formatBRL(l.amount)]),
    foot: [['Total', b.coupon_code ? `Cupom ${b.coupon_code}` : '', { content: formatBRL(Number(b.total_amount)), styles: { halign: 'right' } }]],
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 1.6 },
    headStyles: { fillColor: BRAND, textColor: 255 },
    footStyles: { fillColor: [241, 245, 249], textColor: INK, fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'right', cellWidth: 32 } },
    theme: 'grid',
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
  pairs([['Pagamento', paymentLabel(b.payment_method, b.payment_status)]])

  heading('Condições')
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...INK)
  for (const item of [...REQUIREMENTS, ...POLICIES]) {
    const text = doc.splitTextToSize(`${item.title}: ${item.text}`, W - M * 2 - 4) as string[]
    ensure(text.length * 4.3 + 1.5)
    doc.text('•', M, y)
    doc.text(text, M + 4, y)
    y += text.length * 4.3 + 1.5
  }
  y += 2
  const accepted = b.terms_accepted_at
    ? `O locatário aceitou estes termos (versão ${TERMS_VERSION}) no site em ${dateTime(b.terms_accepted_at)}.`
    : `Termos da locação versão ${TERMS_VERSION}.`
  const acceptedLines = doc.splitTextToSize(accepted, W - M * 2) as string[]
  ensure(acceptedLines.length * 4.3 + 2)
  doc.setTextColor(...MUTED).text(acceptedLines, M, y)
  y += acceptedLines.length * 4.3 + 4

  // Assinaturas (na retirada)
  ensure(20)
  const half = (W - M * 2 - 12) / 2
  doc.setDrawColor(...MUTED).setLineWidth(0.2)
  doc.line(M, y + 12, M + half, y + 12)
  doc.line(M + half + 12, y + 12, W - M, y + 12)
  doc.setFontSize(9).setTextColor(...MUTED)
  doc.text('Locatário', M, y + 17)
  doc.text('AstaCar', M + half + 12, y + 17)

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8).setTextColor(...MUTED)
    doc.text('Documento gerado pela AstaCar, projeto de portfólio. Modelo demonstrativo, sem valor legal.', M, H - 10)
    doc.text(`${contractCode(b.id)}  ·  página ${i} de ${pages}`, W - M, H - 10, { align: 'right' })
  }
  return doc
}

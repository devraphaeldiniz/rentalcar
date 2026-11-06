import { BOOKING_STATUS, formatBRL, todayIso } from '@/lib/rental'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FinancialReport, ReportBooking } from '@/lib/reports/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function exportBookingsToPDF(bookings: ReportBooking[], title: string) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(18)
  doc.text(title, 14, 22)
  
  doc.setFontSize(11)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 32)
  
  // Table
  const tableData = bookings.map(booking => [
    booking.user?.email || '-',
    booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : '-',
    format(parseISO(booking.start_date), 'dd/MM/yyyy', { locale: ptBR }),
    format(parseISO(booking.end_date), 'dd/MM/yyyy', { locale: ptBR }),
    formatBRL(Number(booking.total_amount)),
    BOOKING_STATUS[booking.status]?.label ?? booking.status,
  ])
  
  autoTable(doc, {
    startY: 40,
    head: [['Cliente', 'Veículo', 'Início', 'Fim', 'Valor', 'Status']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(10)
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    )
  }
  
  doc.save(`${title.toLowerCase().replace(/ /g, '_')}_${todayIso()}.pdf`)
}

export function exportFinancialReportToPDF(data: FinancialReport) {
  const doc = new jsPDF()
  
  doc.setFontSize(18)
  doc.text('Relatório Financeiro', 14, 22)
  
  doc.setFontSize(11)
  doc.text(`Período: ${data.period}`, 14, 32)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 38)
  
  // Summary
  doc.setFontSize(14)
  doc.text('Resumo', 14, 50)
  
  const summaryData = [
    ['Receita Total', formatBRL(data.totalRevenue)],
    ['Total de Reservas', data.totalBookings],
    ['Ticket Médio', formatBRL(data.averageTicket)],
    ['Reservas Confirmadas', data.confirmedBookings],
    ['Taxa de Confirmação', `${data.confirmationRate}%`],
  ]
  
  autoTable(doc, {
    startY: 55,
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 11 },
  })
  
  // Vehicles performance
  if (data.vehiclePerformance && data.vehiclePerformance.length > 0) {
    doc.addPage()
    doc.setFontSize(14)
    doc.text('Desempenho por Veículo', 14, 22)
    
    const vehicleData = data.vehiclePerformance.map((v) => [
      `${v.brand} ${v.model}`,
      v.bookings,
      formatBRL(v.revenue),
    ])
    
    autoTable(doc, {
      startY: 30,
      head: [['Veículo', 'Reservas', 'Receita']],
      body: vehicleData,
      headStyles: { fillColor: [59, 130, 246] },
    })
  }
  
  doc.save(`relatorio_financeiro_${todayIso()}.pdf`)
}

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function exportBookingsToPDF(bookings: any[], title: string) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(18)
  doc.text(title, 14, 22)
  
  doc.setFontSize(11)
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 32)
  
  // Table
  const tableData = bookings.map(booking => [
    booking.user?.email || '-',
    `${booking.vehicle?.brand} ${booking.vehicle?.model}`,
    format(new Date(booking.start_date), 'dd/MM/yyyy', { locale: ptBR }),
    format(new Date(booking.end_date), 'dd/MM/yyyy', { locale: ptBR }),
    `R$ ${booking.total_amount.toLocaleString('pt-BR')}`,
    booking.status,
  ])
  
  autoTable(doc, {
    startY: 40,
    head: [['Cliente', 'Veículo', 'Início', 'Fim', 'Valor', 'Status']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  })
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages()
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
  
  doc.save(`${title.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
}

export function exportFinancialReportToPDF(data: any) {
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
    ['Receita Total', `R$ ${data.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ['Total de Reservas', data.totalBookings],
    ['Ticket Médio', `R$ ${data.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
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
    
    const vehicleData = data.vehiclePerformance.map((v: any) => [
      `${v.brand} ${v.model}`,
      v.bookings,
      `R$ ${v.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    ])
    
    autoTable(doc, {
      startY: 30,
      head: [['Veículo', 'Reservas', 'Receita']],
      body: vehicleData,
      headStyles: { fillColor: [59, 130, 246] },
    })
  }
  
  doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`)
}

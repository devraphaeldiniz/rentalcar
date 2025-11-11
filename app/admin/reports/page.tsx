'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileText, FileSpreadsheet, Loader2, TrendingUp, DollarSign, Calendar } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { exportToCSV } from '@/lib/reports/csv-export'
import { exportBookingsToPDF, exportFinancialReportToPDF } from '@/lib/reports/pdf-export'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('bookings')
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [bookingsData, setBookingsData] = useState<any[]>([])
  const [financialData, setFinancialData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>({
    revenue: [],
    status: [],
    vehicles: []
  })

  const loadReports = async () => {
    setIsLoading(true)
    try {
      const bookingsRes = await fetch(
        `/api/admin/reports/bookings?startDate=${startDate}&endDate=${endDate}&status=${statusFilter}`
      )
      const bookings = await bookingsRes.json()
      setBookingsData(bookings.bookings || [])

      const financialRes = await fetch(
        `/api/admin/reports/financial?startDate=${startDate}&endDate=${endDate}`
      )
      const financial = await financialRes.json()
      setFinancialData(financial)
      processChartData(bookings.bookings, financial)
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const processChartData = (bookings: any[], financial: any) => {
    const revenueByDay = new Map()
    bookings.forEach(booking => {
      const day = format(new Date(booking.start_date), 'dd/MM')
      if (!revenueByDay.has(day)) {
        revenueByDay.set(day, 0)
      }
      revenueByDay.set(day, revenueByDay.get(day) + booking.total_amount)
    })

    const revenueData = Array.from(revenueByDay.entries()).map(([day, revenue]) => ({
      day,
      revenue
    }))

    const statusCount = new Map()
    bookings.forEach(booking => {
      const status = booking.status
      statusCount.set(status, (statusCount.get(status) || 0) + 1)
    })

    const statusData = Array.from(statusCount.entries()).map(([name, value]) => ({
      name: name === 'pending' ? 'Pendente' : 
            name === 'confirmed' ? 'Confirmada' : 
            name === 'cancelled' ? 'Cancelada' : 'Concluída',
      value
    }))

    const vehicleData = financial?.vehiclePerformance?.slice(0, 5).map((v: any) => ({
      name: `${v.brand} ${v.model}`,
      reservas: v.bookings,
      receita: v.revenue
    })) || []

    setChartData({
      revenue: revenueData,
      status: statusData,
      vehicles: vehicleData
    })
  }

  useEffect(() => {
    loadReports()
  }, [startDate, endDate, statusFilter])

  const handleExportBookingsCSV = () => {
    const csvData = bookingsData.map(booking => ({
      'Data Início': format(new Date(booking.start_date), 'dd/MM/yyyy'),
      'Data Fim': format(new Date(booking.end_date), 'dd/MM/yyyy'),
      'Cliente': booking.user?.email || '-',
      'Veículo': `${booking.vehicle?.brand} ${booking.vehicle?.model}`,
      'Placa': booking.vehicle?.plate,
      'Valor': booking.total_amount,
      'Status': booking.status,
    }))
    exportToCSV(csvData, 'reservas')
  }

  const handleExportBookingsPDF = () => {
    exportBookingsToPDF(bookingsData, 'Relatório de Reservas')
  }

  const handleExportFinancialCSV = () => {
    const csvData = [
      { 'Métrica': 'Receita Total', 'Valor': financialData.totalRevenue },
      { 'Métrica': 'Total de Reservas', 'Valor': financialData.totalBookings },
      { 'Métrica': 'Ticket Médio', 'Valor': financialData.averageTicket },
      { 'Métrica': 'Reservas Confirmadas', 'Valor': financialData.confirmedBookings },
      { 'Métrica': 'Taxa de Confirmação (%)', 'Valor': financialData.confirmationRate },
    ]
    exportToCSV(csvData, 'relatorio_financeiro')
  }

  const handleExportFinancialPDF = () => {
    exportFinancialReportToPDF(financialData)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análises e exportações de dados do sistema</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadReports} className="w-full">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="charts">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Relatório de Reservas</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportBookingsCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" onClick={handleExportBookingsPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{bookingsData.length}</div>
                      <p className="text-sm text-muted-foreground">Total de Reservas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        R$ {bookingsData.reduce((sum, b) => sum + b.total_amount, 0).toLocaleString('pt-BR')}
                      </div>
                      <p className="text-sm text-muted-foreground">Receita Total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {bookingsData.filter(b => b.status === 'confirmed').length}
                      </div>
                      <p className="text-sm text-muted-foreground">Confirmadas</p>
                    </CardContent>
                  </Card>
                </div>
                <div className="text-sm text-muted-foreground">
                  Período: {format(new Date(startDate), 'dd/MM/yyyy')} até {format(new Date(endDate), 'dd/MM/yyyy')}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Relatório Financeiro</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleExportFinancialCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" onClick={handleExportFinancialPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {financialData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <DollarSign className="h-8 w-8 text-green-600 mb-2" />
                        <div className="text-2xl font-bold">
                          R$ {financialData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm text-muted-foreground">Receita Total</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <Calendar className="h-8 w-8 text-blue-600 mb-2" />
                        <div className="text-2xl font-bold">{financialData.totalBookings}</div>
                        <p className="text-sm text-muted-foreground">Total de Reservas</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <TrendingUp className="h-8 w-8 text-purple-600 mb-2" />
                        <div className="text-2xl font-bold">
                          R$ {financialData.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{financialData.confirmationRate}%</div>
                        <p className="text-sm text-muted-foreground">Taxa de Confirmação</p>
                      </CardContent>
                    </Card>
                  </div>

                  {financialData.vehiclePerformance?.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Desempenho por Veículo</h3>
                      <div className="space-y-2">
                        {financialData.vehiclePerformance.map((vehicle: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded">
                            <div>
                              <div className="font-medium">{vehicle.brand} {vehicle.model}</div>
                              <div className="text-sm text-muted-foreground">{vehicle.bookings} reservas</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-green-600">
                                R$ {vehicle.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Receita ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.revenue}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Receita" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.status}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.status.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Veículos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.vehicles}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="reservas" fill="#3b82f6" name="Reservas" />
                      <Bar dataKey="receita" fill="#10b981" name="Receita (R$)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

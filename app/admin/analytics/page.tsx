'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Car, Users } from 'lucide-react'

type Analytics = {
  revenue: {
    total: number
    growth: number
    byMonth: Array<{ month: string; value: number }>
  }
  bookings: {
    total: number
    growth: number
    byStatus: Array<{ status: string; count: number }>
  }
  vehicles: {
    total: number
    available: number
    mostRented: Array<{ vehicle: string; count: number }>
  }
  users: {
    total: number
    growth: number
    newThisMonth: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    revenue: {
      total: 0,
      growth: 0,
      byMonth: []
    },
    bookings: {
      total: 0,
      growth: 0,
      byStatus: []
    },
    vehicles: {
      total: 0,
      available: 0,
      mostRented: []
    },
    users: {
      total: 0,
      growth: 0,
      newThisMonth: 0
    }
  })
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      const data = await response.json()
      setAnalytics(data.analytics || analytics)
    } catch (error) {
      console.error('Erro ao buscar analytics:', error)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Estatísticas</h1>
          <p className="text-muted-foreground">Análise detalhada do negócio</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Último ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {analytics.revenue.total.toLocaleString('pt-BR')}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.revenue.growth >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{analytics.revenue.growth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  <span className="text-red-600">{analytics.revenue.growth}%</span>
                </>
              )}
              <span className="ml-1">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Reservas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.bookings.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.bookings.growth >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{analytics.bookings.growth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  <span className="text-red-600">{analytics.bookings.growth}%</span>
                </>
              )}
              <span className="ml-1">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Veículos Disponíveis</CardTitle>
            <Car className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.vehicles.available}</div>
            <p className="text-xs text-muted-foreground">
              de {analytics.vehicles.total} veículos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Usuários</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.users.newThisMonth}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.users.growth >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{analytics.users.growth}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  <span className="text-red-600">{analytics.users.growth}%</span>
                </>
              )}
              <span className="ml-1">este mês</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Reservas por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas por Status</CardTitle>
            <CardDescription>Distribuição das reservas no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.bookings.byStatus.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.status === 'confirmed' ? 'default' :
                      item.status === 'pending' ? 'secondary' :
                      'destructive'
                    }>
                      {item.status === 'confirmed' ? 'Confirmadas' :
                       item.status === 'pending' ? 'Pendentes' :
                       item.status === 'cancelled' ? 'Canceladas' : 'Concluídas'}
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Veículos Mais Alugados */}
        <Card>
          <CardHeader>
            <CardTitle>Veículos Mais Alugados</CardTitle>
            <CardDescription>Top 5 veículos do período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.vehicles.mostRented.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{index + 1}</Badge>
                    <span className="font-medium">{item.vehicle}</span>
                  </div>
                  <span className="text-lg font-bold">{item.count} aluguéis</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

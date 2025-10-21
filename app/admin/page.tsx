'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Car, 
  Calendar, 
  TrendingUp, 
  DollarSign,
  Shield,
  AlertTriangle,
  Activity
} from 'lucide-react'

type DashboardStats = {
  totalUsers: number
  totalVehicles: number
  totalBookings: number
  activeBookings: number
  revenue: number
  securityAlerts: number
  usersGrowth: number
  bookingsGrowth: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalVehicles: 0,
    totalBookings: 0,
    activeBookings: 0,
    revenue: 0,
    securityAlerts: 0,
    usersGrowth: 0,
    bookingsGrowth: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      change: stats.usersGrowth,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Veículos',
      value: stats.totalVehicles,
      icon: Car,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Reservas Ativas',
      value: stats.activeBookings,
      change: stats.bookingsGrowth,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Receita Total',
      value: `R$ ${stats.revenue.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
  ]

  if (isLoading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de aluguel de veículos
        </p>
      </div>

      {/* Alertas de Segurança */}
      {stats.securityAlerts > 0 && (
        <Card className="mb-6 border-red-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle className="text-red-600">Alertas de Segurança</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Existem <strong>{stats.securityAlerts}</strong> alertas de segurança que requerem atenção.
            </p>
            <Badge variant="destructive" className="mt-2">
              Ação Necessária
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.change !== undefined && (
                <p className={`text-xs ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {card.change >= 0 ? '+' : ''}{card.change}% em relação ao mês passado
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Nova reserva criada</p>
                  <p className="text-xs text-muted-foreground">Há 5 minutos</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo usuário cadastrado</p>
                  <p className="text-xs text-muted-foreground">Há 1 hora</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Car className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Veículo adicionado</p>
                  <p className="text-xs text-muted-foreground">Há 3 horas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>Saúde e performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Banco de Dados</span>
                <Badge variant="secondary" className="text-green-600">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Autenticação</span>
                <Badge variant="secondary" className="text-green-600">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <Badge variant="secondary" className="text-green-600">Online</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Response Time</span>
                <Badge variant="secondary">~120ms</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo das Reservas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo de Reservas</CardTitle>
          <CardDescription>Últimas 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Total de Reservas</span>
              <span className="font-bold">{stats.totalBookings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Reservas Ativas</span>
              <span className="font-bold text-green-600">{stats.activeBookings}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxa de Ocupação</span>
              <span className="font-bold">
                {stats.totalVehicles > 0 
                  ? Math.round((stats.activeBookings / stats.totalVehicles) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

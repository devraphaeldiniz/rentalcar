'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, Car, Calendar, TrendingUp, Clock } from 'lucide-react'

type Stats = {
  totalRevenue: number
  totalBookings: number
  totalVehicles: number
  totalUsers: number
  pendingBookings: number
  activeVehicles: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalBookings: 0,
    totalVehicles: 0,
    totalUsers: 0,
    pendingBookings: 0,
    activeVehicles: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      const data = await response.json()
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
    }
  }

  const cards = [
    {
      title: 'Receita Total',
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR')}`,
      description: 'Total de receitas',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total de Reservas',
      value: stats.totalBookings,
      description: 'Todas as reservas',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      title: 'Veículos',
      value: stats.totalVehicles,
      description: `${stats.activeVehicles} disponíveis`,
      icon: Car,
      color: 'text-purple-600'
    },
    {
      title: 'Usuários',
      value: stats.totalUsers,
      description: 'Total de usuários',
      icon: Users,
      color: 'text-orange-600'
    },
    {
      title: 'Pendentes',
      value: stats.pendingBookings,
      description: 'Reservas pendentes',
      icon: Clock,
      color: 'text-yellow-600'
    },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Receita Mensal</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Gráfico em desenvolvimento
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reservas por Status</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
            Gráfico em desenvolvimento
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

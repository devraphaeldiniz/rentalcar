'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Booking = {
  id: string
  user: {
    email: string
    displayName?: string
  }
  vehicle: {
    brand: string
    model: string
    plate: string
  }
  start_date: string
  end_date: string
  total_amount: number
  status: string
  created_at: string
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500' },
  cancelled: { label: 'Cancelada', color: 'bg-red-500' },
  completed: { label: 'Concluída', color: 'bg-blue-500' },
}

export default function BookingsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/admin/bookings')
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Erro ao buscar reservas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    const action = newStatus === 'confirmed' ? 'aprovar' : 'cancelar'
    if (!confirm(`Deseja realmente ${action} esta reserva?`)) return

    try {
      console.log(`Updating booking ${bookingId} to ${newStatus}`)
      
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()
      console.log('Update result:', result)

      if (response.ok) {
        alert(`Reserva ${action === 'aprovar' ? 'aprovada' : 'cancelada'} com sucesso!`)
        fetchBookings()
      } else {
        alert(`Erro ao ${action} reserva: ${result.error}`)
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar reserva')
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch =
      booking.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Reservas</h1>
        <p className="text-muted-foreground">Gerencie todas as reservas do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, veículo ou placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="confirmed">Confirmadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Veículo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((booking) => {
                const statusInfo = statusConfig[booking.status as keyof typeof statusConfig] || 
                  { label: booking.status, color: 'bg-gray-500' }

                return (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.user.displayName || 'Sem nome'}</div>
                        <div className="text-sm text-muted-foreground">{booking.user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{booking.vehicle.brand} {booking.vehicle.model}</div>
                        <div className="text-sm text-muted-foreground">Placa: {booking.vehicle.plate}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{format(new Date(booking.start_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                        <div className="text-muted-foreground">
                          até {format(new Date(booking.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold">R$ {booking.total_amount.toLocaleString('pt-BR')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusInfo.color} text-white`}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                            >
                              <XCircle className="mr-1 h-4 w-4" />
                              Cancelar
                            </Button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(booking.id, 'completed')}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Concluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredBookings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma reserva encontrada
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

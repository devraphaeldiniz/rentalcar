'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Car, DollarSign, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'

type Booking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  status: string
  created_at: string
  vehicle: {
    id: string
    brand: string
    model: string
    plate: string
    images: string[]
    daily_rate: number
  }
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', icon: Clock },
  confirmed: { label: 'Confirmada', color: 'bg-green-500', icon: CheckCircle },
  cancelled: { label: 'Cancelada', color: 'bg-red-500', icon: XCircle },
  completed: { label: 'Concluída', color: 'bg-blue-500', icon: CheckCircle },
}

export default function MyBookingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    
    if (!isAuthenticated) {
      router.push('/auth/signin')
      return
    }

    fetchBookings()
  }, [isAuthenticated, authLoading])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/bookings/my', {
        credentials: 'include'
      })
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (error) {
      console.error('Erro ao buscar reservas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Minhas Reservas</h1>
        <p className="text-muted-foreground">Gerencie suas reservas de veículos</p>
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma reserva encontrada</p>
            <p className="text-muted-foreground mb-4">Você ainda não fez nenhuma reserva</p>
            <Button onClick={() => router.push('/')}>Ver Veículos</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => {
            const StatusIcon = statusConfig[booking.status as keyof typeof statusConfig]?.icon || Clock
            const statusLabel = statusConfig[booking.status as keyof typeof statusConfig]?.label || booking.status
            const statusColor = statusConfig[booking.status as keyof typeof statusConfig]?.color || 'bg-gray-500'

            return (
              <Card key={booking.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Imagem do veículo */}
                    {booking.vehicle.images && booking.vehicle.images.length > 0 && (
                      <div className="relative h-48 md:h-auto md:w-64 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={booking.vehicle.images[0]}
                          alt={`${booking.vehicle.brand} ${booking.vehicle.model}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    {/* Informações */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">
                            {booking.vehicle.brand} {booking.vehicle.model}
                          </h3>
                          <p className="text-sm text-muted-foreground">Placa: {booking.vehicle.plate}</p>
                        </div>
                        <Badge className={`${statusColor} text-white`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusLabel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Retirada</p>
                            <p className="text-muted-foreground">
                              {format(new Date(booking.start_date), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Devolução</p>
                            <p className="text-muted-foreground">
                              {format(new Date(booking.end_date), "dd 'de' MMMM", { locale: ptBR })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Valor Total</p>
                            <p className="text-lg font-bold text-green-600">
                              R$ {booking.total_amount.toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Reservado em {format(new Date(booking.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

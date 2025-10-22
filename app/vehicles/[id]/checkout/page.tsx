'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar as CalendarIcon, ArrowLeft, CreditCard, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

type Vehicle = {
  id: string
  brand: string
  model: string
  year: number
  plate: string
  daily_rate: number
  images: string[]
  category: string
}

export default function CheckoutPage() {
  const params = useParams()
  const vehicleId = params.id as string
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  useEffect(() => {
    if (authLoading) return
    
    if (!isAuthenticated) {
      router.push('/auth/signin?redirect=/vehicles/' + vehicleId + '/checkout')
      return
    }
    
    fetchVehicle()
  }, [isAuthenticated, vehicleId, authLoading])

  const fetchVehicle = async () => {
    try {
      const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query GetVehicle($id: uuid!) {
              vehicles_by_pk(id: $id) {
                id
                brand
                model
                year
                plate
                daily_rate
                images
                category
              }
            }
          `,
          variables: { id: vehicleId }
        }),
      })

      const result = await response.json()
      
      if (result.data?.vehicles_by_pk) {
        setVehicle(result.data.vehicles_by_pk)
      }
    } catch (err) {
      console.error('Erro ao buscar veículo:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDays = () => {
    if (!startDate || !endDate) return 0
    return differenceInDays(endDate, startDate) + 1
  }

  const calculateTotal = () => {
    if (!vehicle) return 0
    const days = calculateDays()
    return days * vehicle.daily_rate
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!startDate || !endDate) {
      setError('Selecione as datas de início e fim')
      return
    }

    if (endDate <= startDate) {
      setError('A data de devolução deve ser posterior à data de retirada')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const bookingData = {
        vehicle_id: vehicleId,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        total_amount: calculateTotal(),
      }
      
      console.log('=== CHECKOUT SUBMIT ===')
      console.log('User:', user)
      console.log('Booking data:', bookingData)

      const token = localStorage.getItem('token')
      console.log('Token exists:', !!token)

      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(bookingData),
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response data:', result)

      if (!response.ok || result.error) {
        setError(result.error || 'Erro ao criar reserva')
      } else {
        setSuccess(true)
        setTimeout(() => {
          router.push('/profile/bookings')
        }, 2000)
      }
    } catch (err: any) {
      console.error('Erro completo:', err)
      setError('Erro ao processar reserva: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Veículo não encontrado</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-green-500">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-600">Reserva Criada com Sucesso!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Sua reserva foi criada e está aguardando aprovação.</p>
            <p className="text-sm text-muted-foreground mb-6">
              Você será redirecionado para suas reservas em instantes...
            </p>
            <Button onClick={() => router.push('/profile/bookings')}>
              Ver Minhas Reservas
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const days = calculateDays()
  const total = calculateTotal()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link href={`/vehicles/${vehicleId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Finalizar Reserva</h1>
        <p className="text-muted-foreground">Complete as informações para reservar o veículo</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Formulário */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Informações do Veículo */}
              <Card>
                <CardHeader>
                  <CardTitle>Veículo Selecionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {vehicle.images && vehicle.images.length > 0 && (
                      <div className="relative h-24 w-32 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={vehicle.images[0]}
                          alt={`${vehicle.brand} ${vehicle.model}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{vehicle.brand} {vehicle.model}</h3>
                      <p className="text-sm text-muted-foreground">{vehicle.year}</p>
                      <p className="text-sm text-muted-foreground">Placa: {vehicle.plate}</p>
                      <p className="font-semibold mt-2">R$ {vehicle.daily_rate}/dia</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Seleção de Datas */}
              <Card>
                <CardHeader>
                  <CardTitle>Período da Locação</CardTitle>
                  <CardDescription>Selecione as datas de retirada e devolução</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Data de Retirada</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !startDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={setStartDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label>Data de Devolução</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !endDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={setEndDate}
                            disabled={(date) => !startDate || date <= startDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {days > 0 && (
                    <Alert>
                      <AlertDescription>
                        <strong>{days}</strong> {days === 1 ? 'dia' : 'dias'} de locação
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {/* Botão de Confirmar */}
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={!startDate || !endDate || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Confirmar Reserva
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Resumo */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Diária</span>
                <span className="font-medium">R$ {vehicle.daily_rate.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantidade</span>
                <span className="font-medium">{days > 0 ? days : '-'} {days === 1 ? 'dia' : 'dias'}</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-green-600">
                    R$ {total.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

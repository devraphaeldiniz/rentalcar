'use client'

import type { PriceLine } from '@/lib/pricing'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Loader2,
  User,
  Mail,
  Phone,
  IdCard,
  Car,
  Calendar,
  DollarSign,
  Clock
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL } from '@/lib/rental'
import { formatPhone, whatsappUrl } from '@/lib/phone'

type BookingDetails = {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  payment_status?: string
  payment_method?: string
  price_lines?: PriceLine[] | null
  coupon_code?: string | null
  terms_accepted_at?: string | null
  status: string
  created_at: string
  user: {
    id: string
    email: string
    displayName?: string
    phoneNumber?: string
  }
  profile?: { full_name: string | null; phone: string | null; cpf: string | null } | null
  vehicle: {
    id: string
    brand: string
    model: string
    year: number
    plate: string
    daily_rate: number
    images: string[]
  }
}

export default function BookingDetailsPage() {
  const params = useParams()
  const bookingId = params.id as string
  const router = useRouter()
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
    }
  }, [bookingId])

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`)
      const data = await response.json()

      if (response.ok && data?.id) {
        setBooking(data)
      } else {
        setError('Reserva não encontrada')
      }
    } catch (err) {
      console.error('Erro ao buscar reserva:', err)
      setError('Erro ao carregar dados da reserva')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`Deseja realmente ${newStatus === 'confirmed' ? 'aprovar' : newStatus === 'cancelled' ? 'cancelar' : 'concluir'} esta reserva?`)) return

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchBooking()
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const calculateDays = () => {
    if (!booking) return 0
    const start = parseISO(booking.start_date)
    const end = parseISO(booking.end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmada',
      cancelled: 'Cancelada',
      completed: 'Concluída',
    }
    return labels[status] || status
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando detalhes da reserva...</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error || 'Reserva não encontrada'}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/admin/bookings')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Reservas
        </Button>
      </div>
    )
  }

  const days = calculateDays()
  const phone = booking.profile?.phone ?? booking.user.phoneNumber ?? null
  const whatsapp = whatsappUrl(phone, `Olá! Aqui é da AstaCar, sobre a sua reserva do ${booking.vehicle.brand} ${booking.vehicle.model}.`)

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/bookings">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Detalhes da Reserva</h1>
            <p className="text-muted-foreground">ID: {booking.id.slice(0, 8)}...</p>
          </div>
          <Badge className={getStatusColor(booking.status)}>
            {getStatusLabel(booking.status)}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
            <CardDescription>Informações do locatário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.profile?.full_name || booking.user.displayName || 'Sem nome'}</p>
                <p className="text-sm text-muted-foreground">Nome completo</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.user.email}</p>
                <p className="text-sm text-muted-foreground">Email</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                {phone ? (
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                    <a href={`tel:+55${phone}`} className="hover:underline">{formatPhone(phone)}</a>
                    {whatsapp && (
                      <a href={whatsapp} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                        WhatsApp
                      </a>
                    )}
                  </p>
                ) : (
                  <p className="font-medium text-muted-foreground">Não informado no perfil</p>
                )}
                <p className="text-sm text-muted-foreground">Telefone</p>
              </div>
            </div>
            {booking.profile?.cpf && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <IdCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatCpf(booking.profile.cpf)}</p>
                    <p className="text-sm text-muted-foreground">CPF</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Informações do Veículo */}
        <Card>
          <CardHeader>
            <CardTitle>Veículo</CardTitle>
            <CardDescription>Informações do carro alugado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.vehicle.images && booking.vehicle.images.length > 0 && (
              <div className="relative h-40 w-full rounded-lg overflow-hidden">
                <Image
                  src={booking.vehicle.images[0]}
                  alt={`${booking.vehicle.brand} ${booking.vehicle.model}`}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Car className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{booking.vehicle.brand} {booking.vehicle.model} {booking.vehicle.year}</p>
                <p className="text-sm text-muted-foreground">Modelo</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 flex items-center justify-center text-muted-foreground font-mono text-xs">
                #
              </div>
              <div>
                <p className="font-medium font-mono">{booking.vehicle.plate}</p>
                <p className="text-sm text-muted-foreground">Placa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Período da Locação */}
        <Card>
          <CardHeader>
            <CardTitle>Período da Locação</CardTitle>
            <CardDescription>Datas de retirada e devolução</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(parseISO(booking.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">Data de retirada</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {format(parseISO(booking.end_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">Data de devolução</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{days} {days === 1 ? 'dia' : 'dias'}</p>
                <p className="text-sm text-muted-foreground">Duração total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle>Valores</CardTitle>
            <CardDescription>Informações financeiras</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.price_lines && booking.price_lines.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {booking.price_lines.map((l) => (
                  <li key={l.code} className="flex justify-between gap-3">
                    <span>
                      <span className={l.kind === 'discount' ? 'text-success' : ''}>{l.label}</span>
                      <span className="block text-xs text-muted-foreground">{l.detail}</span>
                    </span>
                    <span className={`tabular ${l.amount < 0 ? 'text-success' : ''}`}>{l.amount === 0 ? 'Incluída' : formatBRL(l.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Diária</span>
                  <span className="font-medium">{formatBRL(Number(booking.vehicle.daily_rate))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Quantidade de diárias</span>
                  <span className="font-medium">{days}</span>
                </div>
              </>
            )}
            {booking.coupon_code && <p className="text-sm text-muted-foreground">Cupom usado: <code className="font-bold text-electric">{booking.coupon_code}</code></p>}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="tabular text-2xl font-bold text-success">
                {formatBRL(Number(booking.total_amount))}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{booking.payment_status === 'paid' ? 'Pago online (Mercado Pago)' : booking.payment_status === 'refunded' ? 'Reembolsado' : booking.payment_method === 'online' ? 'Aguardando pagamento online' : 'Pagamento na retirada'}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {booking.terms_accepted_at ? `Termos aceitos em ${new Date(booking.terms_accepted_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : 'Reserva anterior ao aceite de termos'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ações</CardTitle>
          <CardDescription>Gerencie o status da reserva</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            {booking.status === 'pending' && (
              <>
                <Button 
                  onClick={() => handleUpdateStatus('confirmed')}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Aprovar Reserva
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleUpdateStatus('cancelled')}
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Reserva
                </Button>
              </>
            )}
            {booking.status === 'confirmed' && (
              <>
                <Button 
                  onClick={() => handleUpdateStatus('completed')}
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marcar como Concluída
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => handleUpdateStatus('cancelled')}
                  className="flex-1"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar Reserva
                </Button>
              </>
            )}
            {(booking.status === 'cancelled' || booking.status === 'completed') && (
              <Alert>
                <AlertDescription>
                  Esta reserva já foi {booking.status === 'cancelled' ? 'cancelada' : 'concluída'}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informações Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data da reserva:</span>
            <span className="font-medium">
              {format(new Date(booking.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID da reserva:</span>
            <span className="font-mono text-xs">{booking.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID do cliente:</span>
            <span className="font-mono text-xs">{booking.user.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID do veículo:</span>
            <span className="font-mono text-xs">{booking.vehicle.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function formatCpf(cpf: string) {
  const d = cpf.replace(/\D/g, '')
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : cpf
}

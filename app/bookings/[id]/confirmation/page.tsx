import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { requireUser } from '@/lib/auth/authorization'

async function getBooking(id: string, userId: string) {
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetBooking($id: uuid!, $userId: uuid!) {
            bookings(where: { id: { _eq: $id }, user_id: { _eq: $userId } }, limit: 1) {
              id
              start_date
              end_date
              total_amount
              status
              customer_name
              customer_email
              customer_phone
              created_at
              vehicle_id
            }
          }
        `,
        variables: { id, userId }
      }),
      cache: 'no-store'
    })

    const result = await response.json()
    // Só o dono da reserva consegue ver a confirmação.
    return result.data?.bookings?.[0] || null
  } catch (error) {
    return null
  }
}

export default async function BookingConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const booking = user ? await getBooking(id, user.userId) : null

  if (!booking) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="text-center mb-8">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Reserva confirmada!</h1>
        <p className="text-muted-foreground">
          {booking.customer_email ? `Enviamos os detalhes para ${booking.customer_email}` : 'Os detalhes estão em Minhas Reservas.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Código da reserva</p>
            <p className="font-mono font-semibold">{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Retirada</p>
              <p className="font-semibold">
                {format(new Date(booking.start_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Devolução</p>
              <p className="font-semibold">
                {format(new Date(booking.end_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Cliente</p>
            <p className="font-semibold">{booking.customer_name}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            <p className="font-semibold">{booking.customer_phone}</p>
          </div>

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Valor Total</span>
              <span className="text-2xl font-bold">R$ {booking.total_amount.toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Status: {booking.status === 'pending' ? 'Aguardando pagamento' : 'Confirmado'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-4 justify-center">
        <Button asChild>
          <Link href="/">Voltar para início</Link>
        </Button>
      </div>
    </div>
  )
}
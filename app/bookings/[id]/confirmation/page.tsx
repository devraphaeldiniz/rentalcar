import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'
import { BOOKING_STATUS, formatBRL, formatLongDate, pluralDays, rentalDays } from '@/lib/rental'

type Booking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  status: string
  vehicle: { brand: string; model: string; images: string[] | null; image_url: string | null } | null
}

export default async function BookingConfirmationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await requireUser()
  if (!user) notFound()

  const data = await adminGraphql<{ bookings: Booking[] }>(
    `query MyBooking($id: uuid!, $userId: uuid!) {
      bookings(where: { id: { _eq: $id }, user_id: { _eq: $userId } }, limit: 1) {
        id start_date end_date total_amount status
        vehicle { brand model images image_url }
      }
    }`,
    { id: params.id, userId: user.userId },
  ).catch(() => ({ bookings: [] as Booking[] }))

  // Só o dono da reserva vê esta página.
  const booking = data.bookings[0]
  if (!booking) notFound()

  const days = rentalDays(booking.start_date, booking.end_date)
  const status = BOOKING_STATUS[booking.status]?.label ?? booking.status
  const image = booking.vehicle?.images?.[0] || booking.vehicle?.image_url

  return (
    <main className="container max-w-2xl py-12">
      <CheckCircle2 className="h-10 w-10 text-primary" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">Reserva registrada</h1>
      <p className="mt-2 text-muted-foreground">
        Ela fica como &ldquo;{status.toLowerCase()}&rdquo; até a loja confirmar. Você acompanha tudo em Minhas reservas.
      </p>

      <section className="mt-8 overflow-hidden rounded-lg border">
        {image && (
          <div className="relative aspect-[16/7] bg-muted">
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        )}
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Carro</dt>
            <dd className="font-bold">{booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Código</dt>
            <dd className="font-bold tracking-wide">{booking.id.slice(0, 8).toUpperCase()}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Retirada</dt>
            <dd className="font-medium">{formatLongDate(booking.start_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Devolução</dt>
            <dd className="font-medium">{formatLongDate(booking.end_date)}</dd>
          </div>
          <div className="sm:col-span-2 flex items-end justify-between border-t pt-4">
            <div>
              <dt className="text-sm text-muted-foreground">Total</dt>
              <dd className="text-sm text-muted-foreground">{pluralDays(days)}, pagamento na retirada</dd>
            </div>
            <dd className="text-2xl font-bold"><span className="bg-lane/30 px-1 -mx-1 rounded-sm">{formatBRL(Number(booking.total_amount))}</span></dd>
          </div>
        </dl>
      </section>

      <p className="mt-6 text-sm text-muted-foreground">Na retirada, leve documento com foto e CNH válida.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild><Link href="/profile/bookings">Ver minhas reservas</Link></Button>
        <Button asChild variant="outline"><Link href="/">Voltar aos carros</Link></Button>
      </div>
    </main>
  )
}

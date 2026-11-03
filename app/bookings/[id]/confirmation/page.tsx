import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'
import type { PriceLine } from '@/lib/pricing'
import { BOOKING_STATUS, formatBRL, formatLongDate, pluralDays, rentalDays } from '@/lib/rental'

type Booking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  status: string
  price_lines: PriceLine[] | null
  vehicle: { brand: string; model: string; images: string[] | null; image_url: string | null } | null
}

export default async function BookingConfirmationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await requireUser()
  if (!user) notFound()

  const data = await adminGraphql<{ bookings: Booking[] }>(
    `query MyBooking($id: uuid!, $userId: uuid!) {
      bookings(where: { id: { _eq: $id }, user_id: { _eq: $userId } }, limit: 1) {
        id start_date end_date total_amount status price_lines
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
      <CheckCircle2 className="h-10 w-10 text-success" aria-hidden />
      <h1 className="mt-4 text-3xl font-bold">Reserva registrada</h1>
      <p className="mt-2 text-muted-foreground">
        Ela fica como &ldquo;{status.toLowerCase()}&rdquo; até a loja confirmar. Você acompanha tudo em Minhas reservas.
      </p>

      <section className="mt-8 overflow-hidden rounded-2xl border bg-card">
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
            <dd className="font-bold tracking-wide text-electric">ASTA-{booking.id.slice(0, 8).toUpperCase()}</dd>
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
            <dd className="text-2xl font-bold"><span className="tabular font-black text-electric">{formatBRL(Number(booking.total_amount))}</span></dd>
          </div>
        </dl>
        {booking.price_lines && booking.price_lines.length > 1 && (
          <ul className="space-y-2 border-t p-5 text-sm">
            {booking.price_lines.map((l) => (
              <li key={l.code} className="flex justify-between gap-3">
                <span className={l.kind === 'discount' ? 'text-success' : 'text-muted-foreground'}>{l.label}</span>
                <span className={`tabular ${l.kind === 'discount' ? 'text-success' : ''}`}>{l.amount === 0 ? 'Incluída' : formatBRL(l.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-sm text-muted-foreground">Na retirada, leve documento com foto e CNH válida.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="brand"><Link href="/profile/bookings">Ver minhas reservas</Link></Button>
        <Button asChild variant="outline"><Link href="/">Voltar aos carros</Link></Button>
      </div>
    </main>
  )
}

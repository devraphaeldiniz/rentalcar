import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PaymentBrick } from '@/components/client/payment-brick'
import { adminGraphql, requireUser } from '@/lib/auth/authorization'
import { onlinePaymentEnabled, paymentsApi, syncPayment } from '@/lib/payments/mercadopago'
import { formatBRL, formatShortDate, pluralDays, rentalDays } from '@/lib/rental'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pagamento da reserva', robots: { index: false } }

type Booking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number
  status: string
  payment_status: string | null
  vehicle: { brand: string; model: string } | null
  payments: { mp_payment_id: string; status: string }[]
}

const QUERY = `query PayBooking($id: uuid!, $userId: uuid!) {
  bookings(where: { id: { _eq: $id }, user_id: { _eq: $userId } }, limit: 1) {
    id start_date end_date total_amount status payment_status
    vehicle { brand model }
    payments(order_by: { created_at: desc }, limit: 1) { mp_payment_id status }
  }
}`

// Página própria do pagamento online (Payment Brick do Mercado Pago).
export default async function BookingPaymentPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const user = await requireUser()
  if (!user) notFound()

  const load = () =>
    adminGraphql<{ bookings: Booking[] }>(QUERY, { id, userId: user.userId }).catch(() => ({ bookings: [] as Booking[] }))
  let booking = (await load()).bookings[0]
  if (!booking) notFound()

  // Pix/boleto aguardando: consulta o Mercado Pago na hora, caso o webhook ainda não tenha chegado.
  const last = booking.payments?.[0]
  if (last && ['pending', 'in_process', 'authorized'].includes(last.status) && booking.payment_status !== 'paid') {
    try {
      await syncPayment(await paymentsApi().get({ id: last.mp_payment_id }))
      booking = (await load()).bookings[0] ?? booking
    } catch (error) {
      console.error('[pagamento] sync', error)
    }
  }
  const latest = booking.payments?.[0]
  const pendingPaymentId = latest && ['pending', 'in_process'].includes(latest.status) ? latest.mp_payment_id : null

  const name = booking.vehicle ? `${booking.vehicle.brand} ${booking.vehicle.model}` : 'Reserva'
  const days = rentalDays(booking.start_date, booking.end_date)
  const closed = !['pending', 'confirmed'].includes(booking.status)

  return (
    <main className="container max-w-2xl py-10">
      <Link href={`/bookings/${booking.id}/confirmation`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar para a reserva
      </Link>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-electric">Pagamento online</p>
      <h1 className="mt-1 text-3xl font-extrabold">Pague sua reserva</h1>
      <p className="mt-2 text-muted-foreground">
        {name} · {formatShortDate(booking.start_date)} a {formatShortDate(booking.end_date)} · {pluralDays(days)} · ASTA-{booking.id.slice(0, 8).toUpperCase()}
      </p>

      <section className="mt-8 rounded-2xl border bg-card p-5">
        {booking.payment_status === 'paid' ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" aria-hidden />
            <div>
              <p className="font-bold">Pagamento aprovado</p>
              <p className="text-sm text-muted-foreground">Recebemos {formatBRL(Number(booking.total_amount))}. Sua reserva está confirmada.</p>
              <Button asChild variant="brand" className="mt-4"><Link href={`/bookings/${booking.id}/confirmation`}>Ver minha reserva</Link></Button>
            </div>
          </div>
        ) : closed ? (
          <p className="text-sm text-muted-foreground">Esta reserva não aceita mais pagamento.</p>
        ) : !onlinePaymentEnabled() ? (
          <p role="alert" className="text-sm text-muted-foreground">
            O pagamento online está indisponível no momento. Sua reserva continua garantida com pagamento na retirada.
          </p>
        ) : (
          <PaymentBrick
            bookingId={booking.id}
            amount={Number(booking.total_amount)}
            payerEmail={user.email}
            pendingPaymentId={pendingPaymentId}
          />
        )}
      </section>

      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4" aria-hidden /> Pagamento processado pelo Mercado Pago. A AstaCar não recebe nem guarda os dados do seu cartão.
      </p>
    </main>
  )
}

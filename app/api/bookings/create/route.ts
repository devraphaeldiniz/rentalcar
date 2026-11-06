export const dynamic = 'force-dynamic'

import { after, type NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'
import { z } from 'zod'
import { isIsoDate, isPastDate } from '@/lib/rental'
import { QuoteError } from '@/lib/pricing'
import { claimCoupon, quoteReservation, releaseCoupon } from '@/lib/quote-server'
import { onlinePaymentEnabled } from '@/lib/payments/mercadopago'
import { sendBookingConfirmation } from '@/lib/email/booking-emails'
import { SESSION_COOKIE, VISITOR_COOKIE, deviceFrom, recordEvent, validId } from '@/lib/analytics/server'

const bookingInput = z.object({
  vehicle_id: z.string().uuid(),
  start_date: z.string().refine(isIsoDate),
  end_date: z.string().refine(isIsoDate),
  protection: z.string().max(40).optional(),
  addons: z.array(z.string().max(40)).max(10).optional(),
  coupon: z.string().max(30).optional(),
  accept_terms: z.literal(true, { message: 'Aceite os termos da locação para continuar.' }),
  payment_method: z.enum(['online', 'on_pickup']).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = bookingInput.safeParse(await req.json())
    if (!parsed.success) {
      const termsIssue = parsed.error.issues.find((i) => i.path[0] === 'accept_terms')
      return NextResponse.json({ error: termsIssue?.message ?? 'Dados de reserva inválidos' }, { status: 400 })
    }

    const { vehicle_id, start_date, end_date, protection, addons, coupon } = parsed.data
    // Sem Mercado Pago configurado, toda reserva continua com pagamento na retirada.
    const payment_method = parsed.data.payment_method === 'online' && onlinePaymentEnabled() ? 'online' : 'on_pickup'
    const start = new Date(`${start_date}T00:00:00Z`)
    const end = new Date(`${end_date}T00:00:00Z`)
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000)
    if (days < 1 || days > 90) return NextResponse.json({ error: 'Período de reserva inválido' }, { status: 400 })
    // Mesmo calendário do site (Brasília), sem depender do fuso do servidor.
    if (isPastDate(start_date)) return NextResponse.json({ error: 'A retirada não pode ser em uma data que já passou.' }, { status: 400 })

    // Identidade validada no Nhost Auth; nunca a partir de um JWT decodificado à mão.
    const auth = await requireUser()
    if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const user_id = auth.userId

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
    const headers = { 'Content-Type': 'application/json', 'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET! }
    const vehicleResponse = await fetch(url, { method: 'POST', headers, body: JSON.stringify({
      query: `query Vehicle($id: uuid!) { vehicles_by_pk(id: $id) { id daily_rate status } }`,
      variables: { id: vehicle_id },
    }) })
    const vehicleResult = await vehicleResponse.json()
    const vehicle = vehicleResult.data?.vehicles_by_pk
    if (!vehicle || vehicle.status !== 'available') return NextResponse.json({ error: 'Veículo indisponível' }, { status: 409 })

    // O valor é sempre recalculado aqui, com os preços atuais do banco.
    let priced: Awaited<ReturnType<typeof quoteReservation>>
    try {
      priced = await quoteReservation({ dailyRate: Number(vehicle.daily_rate), start: start_date, end: end_date, protection, addons, coupon })
    } catch (error) {
      if (error instanceof QuoteError) return NextResponse.json({ error: error.message }, { status: 400 })
      throw error
    }
    if (priced.couponError) return NextResponse.json({ error: priced.couponError }, { status: 400 })
    const { quote } = priced
    const total_amount = quote.total

    // O uso do cupom é reservado antes de gravar; se a reserva falhar, ele volta.
    if (priced.coupon && !(await claimCoupon(priced.coupon))) {
      return NextResponse.json({ error: 'Este cupom acabou de atingir o limite de usos.' }, { status: 409 })
    }
    const bookingResponse = await fetch(url, { method: 'POST', headers, body: JSON.stringify({
      query: `mutation CreateBooking($object: bookings_insert_input!) { insert_bookings_one(object: $object) { id status start_date end_date total_amount payment_method } }`,
      variables: { object: {
        user_id, vehicle_id, start_date, end_date, total_amount, status: 'pending', payment_method,
        base_amount: quote.base, extras_amount: quote.extras, discount_amount: quote.discount,
        price_lines: quote.lines, terms_accepted_at: new Date().toISOString(), coupon_code: priced.coupon,
        customer_email: auth.email, customer_name: auth.user.displayName ?? null,
      } },
    }) })
    const result = await bookingResponse.json()
    if (!bookingResponse.ok || result.errors) {
      if (priced.coupon) await releaseCoupon(priced.coupon)
      // A trava bookings_no_overlap do banco impede duas reservas no mesmo período.
      const message = JSON.stringify(result.errors ?? '')
      if (message.includes('bookings_no_overlap') || message.includes('exclusion')) {
        return NextResponse.json({ error: 'Este carro já está reservado em parte desse período. Escolha outras datas.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Não foi possível criar a reserva' }, { status: 500 })
    }
    const booking = result.data?.insert_bookings_one
    await createAuditLog({
      userId: user_id,
      action: 'booking.created',
      resource: 'booking',
      resourceId: booking?.id,
      ipAddress: await getClientIP(),
      userAgent: await getUserAgent(),
      metadata: { vehicle_id, start_date, end_date, total_amount, payment_method, protection: quote.protection, addons: quote.addons, coupon: priced.coupon },
    })
    // Funil do painel: só registra se a pessoa aceitou o monitoramento (o cookie da visita existe).
    const sid = req.cookies.get(SESSION_COOKIE)?.value
    if (validId(sid)) {
      const vid = req.cookies.get(VISITOR_COOKIE)?.value
      await recordEvent({
        session_id: sid,
        visitor_id: validId(vid) ? vid : null,
        user_id,
        event: 'booking_created',
        vehicle_id,
        meta: { days, total: total_amount, protection: quote.protection, addons: quote.addons.length },
        device: deviceFrom(req.headers.get('user-agent')),
      }).catch((error) => console.error('[track] booking_created', error))
    }
    // Pagamento na retirada: confirma por e-mail já. Online: o e-mail sai quando o pagamento for aprovado.
    if (booking?.id && payment_method === 'on_pickup') after(() => sendBookingConfirmation(booking.id))
    return NextResponse.json({ success: true, booking })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar reserva' }, { status: 500 })
  }
}

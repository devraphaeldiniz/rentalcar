export const dynamic = 'force-dynamic'

import { after, type NextRequest, NextResponse } from 'next/server'
import { adminGraphql, requireUser } from '@/lib/auth/authorization'
import { type CnhData, cnhProblems } from '@/lib/cnh'
import { demoBookingProblem, demoOnlinePayment, isDemoAccount } from '@/lib/demo'
import { todayIso } from '@/lib/rental'
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

    // Conta de demonstração (compartilhada): limites para não segurar a frota.
    const demo = isDemoAccount(auth.email)
    if (demo) {
      const open = await adminGraphql<{ bookings_aggregate: { aggregate: { count: number } } }>(
        `query Open($uid: uuid!) { bookings_aggregate(where: { user_id: { _eq: $uid }, status: { _in: ["pending", "confirmed"] } }) { aggregate { count } } }`,
        { uid: user_id },
      )
      const problem = demoBookingProblem({ openBookings: open.bookings_aggregate.aggregate.count, days, startDate: start_date, today: todayIso() })
      if (problem) return NextResponse.json({ error: problem }, { status: 409 })
    }
    // Sem Mercado Pago configurado, toda reserva continua com pagamento na retirada.
    // Na demonstração, só paga online se DEMO_ONLINE_PAYMENT=on (credenciais de teste).
    const payment_method = parsed.data.payment_method === 'online' && onlinePaymentEnabled() && (!demo || demoOnlinePayment()) ? 'online' : 'on_pickup'

    // CNH válida na retirada e com 2 anos de habilitação (a conta de demonstração não guarda documento).
    if (!demo) {
      const profile = await adminGraphql<{ profiles_by_pk: CnhData | null }>(
        'query Cnh($id: uuid!) { profiles_by_pk(id: $id) { cnh_number cnh_category cnh_expires_on cnh_first_issued_on } }',
        { id: user_id },
      ).catch(() => null)
      // Sem a migração 016 aplicada, a reserva segue como antes.
      if (profile) {
        const problems = cnhProblems(profile.profiles_by_pk, start_date)
        if (problems.length > 0) return NextResponse.json({ error: problems[0], cnh: problems }, { status: 422 })
      }
    }

    const { vehicles_by_pk: vehicle } = await adminGraphql<{ vehicles_by_pk: { id: string; daily_rate: number | string; status: string } | null }>(
      'query Vehicle($id: uuid!) { vehicles_by_pk(id: $id) { id daily_rate status } }',
      { id: vehicle_id },
    )
    if (vehicle?.status !== 'available') return NextResponse.json({ error: 'Veículo indisponível' }, { status: 409 })

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
    type Created = { id: string; status: string; start_date: string; end_date: string; total_amount: number; payment_method: string }
    let booking: Created
    try {
      const created = await adminGraphql<{ insert_bookings_one: Created }>(
        'mutation CreateBooking($object: bookings_insert_input!) { insert_bookings_one(object: $object) { id status start_date end_date total_amount payment_method } }',
        {
          object: {
            user_id, vehicle_id, start_date, end_date, total_amount, status: 'pending', payment_method,
            base_amount: quote.base, extras_amount: quote.extras, discount_amount: quote.discount,
            price_lines: quote.lines, terms_accepted_at: new Date().toISOString(), coupon_code: priced.coupon,
            customer_email: auth.email, customer_name: auth.user.displayName ?? null,
          },
        },
      )
      booking = created.insert_bookings_one
    } catch (error) {
      if (priced.coupon) await releaseCoupon(priced.coupon)
      // A trava bookings_no_overlap do banco impede duas reservas no mesmo período.
      const message = String((error as Error)?.message ?? error)
      if (message.includes('bookings_no_overlap') || message.includes('exclusion')) {
        return NextResponse.json({ error: 'Este carro já está reservado em parte desse período. Escolha outras datas.' }, { status: 409 })
      }
      if (message.includes('vehicle_blocked')) {
        return NextResponse.json({ error: 'Este carro está em manutenção em parte desse período. Escolha outras datas ou outro carro.' }, { status: 409 })
      }
      console.error('[bookings/create]', error)
      return NextResponse.json({ error: 'Não foi possível criar a reserva' }, { status: 500 })
    }
    await createAuditLog({
      userId: user_id,
      action: 'booking.created',
      resource: 'booking',
      resourceId: booking.id,
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
    if (payment_method === 'on_pickup') after(() => sendBookingConfirmation(booking.id))
    return NextResponse.json({ success: true, booking })
  } catch (error) {
    console.error('[bookings/create]', error)
    return NextResponse.json({ error: 'Erro ao processar reserva' }, { status: 500 })
  }
}

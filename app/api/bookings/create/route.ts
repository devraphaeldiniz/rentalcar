export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'
import { z } from 'zod'
import { isIsoDate } from '@/lib/rental'
import { computeQuote, QuoteError } from '@/lib/pricing'
import { getActiveExtras } from '@/lib/extras-server'
import { SESSION_COOKIE, VISITOR_COOKIE, deviceFrom, recordEvent, validId } from '@/lib/analytics/server'

const bookingInput = z.object({
  vehicle_id: z.string().uuid(),
  start_date: z.string().refine(isIsoDate),
  end_date: z.string().refine(isIsoDate),
  protection: z.string().max(40).optional(),
  addons: z.array(z.string().max(40)).max(10).optional(),
  accept_terms: z.literal(true, { message: 'Aceite os termos da locação para continuar.' }),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = bookingInput.safeParse(await req.json())
    if (!parsed.success) {
      const termsIssue = parsed.error.issues.find((i) => i.path[0] === 'accept_terms')
      return NextResponse.json({ error: termsIssue?.message ?? 'Dados de reserva inválidos' }, { status: 400 })
    }

    const { vehicle_id, start_date, end_date, protection, addons } = parsed.data
    const start = new Date(`${start_date}T00:00:00Z`)
    const end = new Date(`${end_date}T00:00:00Z`)
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000)
    if (days < 1 || days > 90) return NextResponse.json({ error: 'Período de reserva inválido' }, { status: 400 })
    // Tolera um dia de diferença de fuso entre o navegador e o servidor.
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (start_date < yesterday) return NextResponse.json({ error: 'A retirada não pode ser em uma data que já passou.' }, { status: 400 })

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
    let quote: ReturnType<typeof computeQuote>
    try {
      quote = computeQuote({ dailyRate: Number(vehicle.daily_rate), days, extras: await getActiveExtras(), protectionCode: protection, addonCodes: addons })
    } catch (error) {
      if (error instanceof QuoteError) return NextResponse.json({ error: error.message }, { status: 400 })
      throw error
    }
    const total_amount = quote.total
    const bookingResponse = await fetch(url, { method: 'POST', headers, body: JSON.stringify({
      query: `mutation CreateBooking($object: bookings_insert_input!) { insert_bookings_one(object: $object) { id status start_date end_date total_amount } }`,
      variables: { object: {
        user_id, vehicle_id, start_date, end_date, total_amount, status: 'pending',
        base_amount: quote.base, extras_amount: quote.extras, discount_amount: quote.discount,
        price_lines: quote.lines, terms_accepted_at: new Date().toISOString(),
        customer_email: auth.email, customer_name: auth.user.displayName ?? null,
      } },
    }) })
    const result = await bookingResponse.json()
    if (!bookingResponse.ok || result.errors) {
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
      metadata: { vehicle_id, start_date, end_date, total_amount, protection: quote.protection, addons: quote.addons },
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
    return NextResponse.json({ success: true, booking })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar reserva' }, { status: 500 })
  }
}

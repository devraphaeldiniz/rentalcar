export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/authorization'
import { z } from 'zod'

const bookingInput = z.object({
  vehicle_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = bookingInput.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Dados de reserva inválidos' }, { status: 400 })

    const { vehicle_id, start_date, end_date } = parsed.data
    const start = new Date(`${start_date}T00:00:00Z`)
    const end = new Date(`${end_date}T00:00:00Z`)
    const days = Math.ceil((end.getTime() - start.getTime()) / 86400000)
    if (days < 1 || days > 90) return NextResponse.json({ error: 'Período de reserva inválido' }, { status: 400 })

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

    const total_amount = Number(vehicle.daily_rate) * days
    const bookingResponse = await fetch(url, { method: 'POST', headers, body: JSON.stringify({
      query: `mutation CreateBooking($object: bookings_insert_input!) { insert_bookings_one(object: $object) { id status start_date end_date total_amount } }`,
      variables: { object: {
        user_id, vehicle_id, start_date, end_date, total_amount, status: 'pending',
        customer_email: auth.email, customer_name: auth.user.displayName ?? null,
      } },
    }) })
    const result = await bookingResponse.json()
    if (!bookingResponse.ok || result.errors) return NextResponse.json({ error: 'Não foi possível criar a reserva' }, { status: 500 })
    return NextResponse.json({ success: true, booking: result.data?.insert_bookings_one })
  } catch {
    return NextResponse.json({ error: 'Erro ao processar reserva' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'

const reviewInput = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const parsed = reviewInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Avaliação inválida' }, { status: 400 })
  const { bookingId, rating, comment } = parsed.data

  try {
    // Só quem fez a reserva, e depois de concluída, pode avaliar.
    // O veículo vem da reserva, não do corpo da requisição.
    const { bookings_by_pk: booking } = await adminGraphql<{
      bookings_by_pk: { user_id: string; vehicle_id: string; status: string } | null
    }>('query Booking($id: uuid!) { bookings_by_pk(id: $id) { user_id vehicle_id status } }', { id: bookingId })

    if (!booking || booking.user_id !== auth.userId) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }
    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Só é possível avaliar reservas concluídas' }, { status: 409 })
    }

    const data = await adminGraphql<{ insert_reviews_one: unknown }>(
      `mutation InsertReview($object: reviews_insert_input!) {
        insert_reviews_one(object: $object) { id rating comment created_at }
      }`,
      {
        object: {
          booking_id: bookingId,
          vehicle_id: booking.vehicle_id,
          user_id: auth.userId,
          rating,
          comment: comment || null,
          status: 'pending',
        },
      },
    )
    return NextResponse.json(data.insert_reviews_one)
  } catch (error) {
    console.error('[reviews POST]', error)
    return NextResponse.json({ error: 'Erro ao criar avaliação' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const vehicleId = req.nextUrl.searchParams.get('vehicleId')
  if (!vehicleId || !z.string().uuid().safeParse(vehicleId).success) {
    return NextResponse.json({ error: 'vehicleId inválido' }, { status: 400 })
  }

  try {
    // Rota pública: devolve só o nome de exibição, nunca o e-mail de quem avaliou.
    const data = await adminGraphql<{ reviews: unknown[] }>(
      `query GetReviews($vehicleId: uuid!) {
        reviews(
          where: { vehicle_id: { _eq: $vehicleId }, status: { _eq: "approved" } }
          order_by: { created_at: desc }
        ) {
          id
          rating
          comment
          created_at
          user { displayName }
        }
      }`,
      { vehicleId },
    )
    return NextResponse.json(data.reviews ?? [])
  } catch (error) {
    console.error('[reviews GET]', error)
    return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
  }
}

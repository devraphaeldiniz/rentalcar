export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'

export async function GET() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const data = await adminGraphql<{ bookings: unknown[] }>(
      `query GetUserBookings($user_id: uuid!) {
        bookings(where: { user_id: { _eq: $user_id } }, order_by: { created_at: desc }) {
          id
          start_date
          end_date
          total_amount
          status
          created_at
          vehicle { brand model year plate images }
        }
      }`,
      { user_id: auth.userId },
    )
    return NextResponse.json({ bookings: data.bookings ?? [] })
  } catch (error) {
    console.error('[profile/bookings]', error)
    return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
  }
}

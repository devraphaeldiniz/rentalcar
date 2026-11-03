export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'

const STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled']

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ bookings_by_pk: unknown }>(
      `query AdminBooking($id: uuid!) {
        bookings_by_pk(id: $id) {
          id start_date end_date total_amount status payment_status created_at price_lines coupon_code terms_accepted_at
          user { id email displayName phoneNumber }
          vehicle { id brand model year plate daily_rate images }
        }
      }`,
      { id: params.id },
    )
    if (!data.bookings_by_pk) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    return NextResponse.json(data.bookings_by_pk)
  } catch (error) {
    console.error('[admin/bookings/:id GET]', error)
    return NextResponse.json({ error: 'Erro ao carregar a reserva' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const { status } = await req.json()
    const { id: bookingId } = await params
    if (!STATUSES.includes(status)) return NextResponse.json({ error: 'Status inválido' }, { status: 400 })

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateBookingStatus($id: uuid!, $status: String!) {
            update_bookings_by_pk(
              pk_columns: { id: $id }
              _set: { status: $status }
            ) {
              id
              status
            }
          }
        `,
        variables: { 
          id: bookingId, 
          status: status 
        }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }


    return NextResponse.json({ 
      success: true,
      booking: result.data?.update_bookings_by_pk
    })
  } catch (error: any) {
    console.error('❌ API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar reserva' },
      { status: 500 }
    )
  }
}

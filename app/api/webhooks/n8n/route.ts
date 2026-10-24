import { NextRequest, NextResponse } from 'next/server'

const GRAPHQL_URL = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

const UPDATE_BOOKING = `
  mutation UpdateBooking($id: uuid!, $set: bookings_set_input!) {
    update_bookings_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`

async function graphqlRequest(query: string, variables: Record<string, unknown>) {
  const response = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
    },
    body: JSON.stringify({ query, variables }),
  })

  const result = await response.json()
  if (result.errors) {
    throw new Error(result.errors[0].message)
  }
  return result.data
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, data } = body

    switch (event) {
      case 'booking.confirmed':
        await graphqlRequest(UPDATE_BOOKING, {
          id: data.booking_id,
          set: { status: 'confirmed' },
        })
        break

      case 'payment.received':
        await graphqlRequest(UPDATE_BOOKING, {
          id: data.booking_id,
          set: { payment_status: 'paid' },
        })
        break

      default:
        return NextResponse.json({ error: 'Unknown event' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
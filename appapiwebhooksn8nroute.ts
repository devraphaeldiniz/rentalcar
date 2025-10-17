import { NextRequest, NextResponse } from 'next/server'
import { NhostClient } from '@nhost/nextjs'

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nhost = new NhostClient({
      subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN!,
      region: process.env.NEXT_PUBLIC_NHOST_REGION!,
      adminSecret: process.env.NHOST_ADMIN_SECRET!,
    })

    const body = await req.json()
    const { event, data } = body

    const UPDATE_BOOKING = `
      mutation UpdateBooking($id: uuid!, $set: bookings_set_input!) {
        update_bookings_by_pk(pk_columns: { id: $id }, _set: $set) {
          id
        }
      }
    `

    switch (event) {
      case 'booking.confirmed':
        await nhost.graphql.request(UPDATE_BOOKING, {
          id: data.booking_id,
          set: { status: 'confirmed' }
        })
        break

      case 'payment.received':
        await nhost.graphql.request(UPDATE_BOOKING, {
          id: data.booking_id,
          set: { payment_status: 'paid' }
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
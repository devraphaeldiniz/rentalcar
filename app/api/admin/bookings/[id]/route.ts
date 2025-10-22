import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await req.json()
    const bookingId = params.id

    console.log('=== UPDATE BOOKING ===')
    console.log('Booking ID:', bookingId)
    console.log('New status:', status)

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
    console.log('GraphQL Response:', JSON.stringify(result, null, 2))

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    console.log('✅ Booking updated successfully!')

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

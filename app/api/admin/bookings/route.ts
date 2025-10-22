import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetBookings {
            bookings(order_by: { created_at: desc }) {
              id
              start_date
              end_date
              total_amount
              status
              created_at
              user {
                email
                displayName
              }
              vehicle {
                brand
                model
                plate
              }
            }
          }
        `
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

    return NextResponse.json({ bookings: result.data?.bookings || [] })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar reservas' },
      { status: 500 }
    )
  }
}

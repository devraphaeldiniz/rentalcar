import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    // Pegar token do cookie
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Decodificar token para pegar user_id
    const payload = JSON.parse(atob(token.split('.')[1]))
    const user_id = payload['https://hasura.io/jwt/claims']['x-hasura-user-id']

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetUserBookings($user_id: uuid!) {
            bookings(
              where: { user_id: { _eq: $user_id } }
              order_by: { created_at: desc }
            ) {
              id
              start_date
              end_date
              total_amount
              status
              created_at
              vehicle {
                brand
                model
                year
                plate
                images
              }
            }
          }
        `,
        variables: { user_id }
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
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

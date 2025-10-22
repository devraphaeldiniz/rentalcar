import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function getAccessToken(refreshToken: string) {
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.auth.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }
    )
    const data = await response.json()
    return data.session?.accessToken
  } catch (error) {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    let token = cookieStore.get('token')?.value

    if (!token) {
      const refreshToken = cookieStore.get('nhostRefreshToken')?.value
      if (refreshToken) {
        token = await getAccessToken(refreshToken)
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const payload = JSON.parse(atob(token.split('.')[1]))
    const user_id = payload['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] || payload.sub

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetMyBookings($user_id: uuid!) {
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
                id
                brand
                model
                plate
                images
                daily_rate
              }
            }
          }
        `,
        variables: { user_id }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    return NextResponse.json({ bookings: result.data?.bookings || [] })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar reservas' },
      { status: 500 }
    )
  }
}

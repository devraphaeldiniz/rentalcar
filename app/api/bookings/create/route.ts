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
    console.error('Error refreshing token:', error)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('=== CREATE BOOKING DEBUG ===')
    
    const cookieStore = cookies()
    
    // Tentar pegar token do header primeiro
    let token = req.headers.get('authorization')?.replace('Bearer ', '')
    console.log('Token from header:', token ? 'Found' : 'Not found')
    
    // Se não tiver no header, tentar do cookie
    if (!token) {
      token = cookieStore.get('token')?.value
      console.log('Token from cookie:', token ? 'Found' : 'Not found')
    }
    
    // Se ainda não tiver, tentar refresh token
    if (!token) {
      const refreshToken = cookieStore.get('nhostRefreshToken')?.value
      console.log('Refresh token:', refreshToken ? 'Found' : 'Not found')
      
      if (refreshToken) {
        token = await getAccessToken(refreshToken)
        console.log('Access token from refresh:', token ? 'Got it!' : 'Failed')
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado. Por favor, faça login novamente.' },
        { status: 401 }
      )
    }

    const { vehicle_id, start_date, end_date, total_amount } = await req.json()

    // Decodificar token
    const payload = JSON.parse(atob(token.split('.')[1]))
    console.log('Token payload:', payload)
    
    const user_id = payload['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] || payload.sub

    if (!user_id) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    console.log('User ID:', user_id)
    console.log('Booking data:', { vehicle_id, start_date, end_date, total_amount })

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation CreateBooking($object: bookings_insert_input!) {
            insert_bookings_one(object: $object) {
              id
              status
              start_date
              end_date
              total_amount
            }
          }
        `,
        variables: {
          object: {
            user_id,
            vehicle_id,
            start_date,
            end_date,
            total_amount,
            status: 'pending'
          }
        }
      }),
    })

    const result = await response.json()
    console.log('GraphQL response:', result)

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    console.log('Booking created successfully!')

    return NextResponse.json({ 
      success: true, 
      booking: result.data?.insert_bookings_one 
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao processar reserva' },
      { status: 500 }
    )
  }
}

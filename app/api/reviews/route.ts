import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('nhostSession')?.value

    if (!token) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { bookingId, vehicleId, rating, comment } = body

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    // Criar review
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          mutation InsertReview($bookingId: uuid!, $vehicleId: uuid!, $rating: Int!, $comment: String) {
            insert_reviews_one(object: {
              booking_id: $bookingId
              vehicle_id: $vehicleId
              rating: $rating
              comment: $comment
              status: "pending"
            }) {
              id
              rating
              comment
              created_at
            }
          }
        `,
        variables: { bookingId, vehicleId, rating, comment }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json({ error: result.errors[0].message }, { status: 400 })
    }

    return NextResponse.json(result.data.insert_reviews_one)
  } catch (error: any) {
    console.error('Error creating review:', error)
    return NextResponse.json({ error: 'Erro ao criar avaliação' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const vehicleId = searchParams.get('vehicleId')

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetReviews($vehicleId: uuid) {
            reviews(
              where: { 
                vehicle_id: { _eq: $vehicleId }
                status: { _eq: "approved" }
              }
              order_by: { created_at: desc }
            ) {
              id
              rating
              comment
              created_at
              user {
                email
                displayName
              }
            }
          }
        `,
        variables: { vehicleId }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json({ error: result.errors[0].message }, { status: 400 })
    }

    return NextResponse.json(result.data.reviews)
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
  }
}

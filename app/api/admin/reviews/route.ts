import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
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
          query GetAllReviews {
            reviews(order_by: { created_at: desc }) {
              id
              rating
              comment
              status
              created_at
              user {
                email
                displayName
              }
              vehicle {
                brand
                model
              }
              booking {
                id
              }
            }
          }
        `
      }),
    })

    const result = await response.json()
    return NextResponse.json(result.data.reviews)
  } catch (error: any) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json({ error: 'Erro ao buscar avaliações' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateReviewStatus($id: uuid!, $status: String!) {
            update_reviews_by_pk(
              pk_columns: { id: $id }
              _set: { status: $status }
            ) {
              id
              status
            }
          }
        `,
        variables: { id, status }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json({ error: result.errors[0].message }, { status: 400 })
    }

    // Atualizar média de rating do veículo
    await updateVehicleRating(result.data.update_reviews_by_pk.id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating review:', error)
    return NextResponse.json({ error: 'Erro ao atualizar avaliação' }, { status: 500 })
  }
}

async function updateVehicleRating(reviewId: string) {
  // Esta função recalcula a média de ratings quando uma review é aprovada/rejeitada
  const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
    },
    body: JSON.stringify({
      query: `
        mutation UpdateVehicleRatings {
          update_vehicles(
            where: {}
            _set: {
              average_rating: 0
              total_reviews: 0
            }
          ) {
            affected_rows
          }
        }
      `
    })
  })
}

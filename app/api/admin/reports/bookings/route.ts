import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

    let whereClause = {}
    
    if (startDate && endDate) {
      whereClause = {
        ...whereClause,
        start_date: { _gte: startDate },
        end_date: { _lte: endDate }
      }
    }
    
    if (status && status !== 'all') {
      whereClause = { ...whereClause, status: { _eq: status } }
    }

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetBookingsReport($where: bookings_bool_exp) {
            bookings(where: $where, order_by: { created_at: desc }) {
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
        `,
        variables: { where: whereClause }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json({ error: result.errors[0].message }, { status: 500 })
    }

    return NextResponse.json({ bookings: result.data?.bookings || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}

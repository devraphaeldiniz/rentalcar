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
          query GetDashboardStats {
            bookings_aggregate {
              aggregate {
                count
                sum {
                  total_amount
                }
              }
            }
            pending: bookings_aggregate(where: { status: { _eq: "pending" } }) {
              aggregate {
                count
              }
            }
            vehicles_aggregate {
              aggregate {
                count
              }
            }
            available_vehicles: vehicles_aggregate(where: { status: { _eq: "available" } }) {
              aggregate {
                count
              }
            }
            profiles_aggregate {
              aggregate {
                count
              }
            }
          }
        `
      }),
    })

    const result = await response.json()

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    const data = result.data
    const stats = {
      totalRevenue: data.bookings_aggregate.aggregate.sum.total_amount || 0,
      totalBookings: data.bookings_aggregate.aggregate.count || 0,
      totalVehicles: data.vehicles_aggregate.aggregate.count || 0,
      totalUsers: data.profiles_aggregate.aggregate.count || 0,
      pendingBookings: data.pending.aggregate.count || 0,
      activeVehicles: data.available_vehicles.aggregate.count || 0,
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}

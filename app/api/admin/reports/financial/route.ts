import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    console.log('=== FINANCIAL REPORT ===')
    console.log('Start date:', startDate)
    console.log('End date:', endDate)

    let whereClause = {}
    
    if (startDate && endDate) {
      whereClause = {
        start_date: { _gte: startDate },
        end_date: { _lte: endDate }
      }
    }

    console.log('Where clause:', JSON.stringify(whereClause))

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetFinancialReport($where: bookings_bool_exp) {
            bookings_aggregate(where: $where) {
              aggregate {
                count
                sum {
                  total_amount
                }
                avg {
                  total_amount
                }
              }
            }
            confirmed: bookings_aggregate(where: { _and: [{ status: { _eq: "confirmed" } }] }) {
              aggregate {
                count
              }
            }
            bookings(where: $where) {
              total_amount
              vehicle {
                id
                brand
                model
              }
            }
          }
        `,
        variables: { where: whereClause }
      }),
    })

    const result = await response.json()
    console.log('GraphQL result:', JSON.stringify(result, null, 2))

    if (result.errors) {
      console.error('GraphQL errors:', result.errors)
      return NextResponse.json({ error: result.errors[0].message }, { status: 500 })
    }

    const data = result.data
    const totalBookings = data.bookings_aggregate.aggregate.count || 0
    const totalRevenue = data.bookings_aggregate.aggregate.sum.total_amount || 0
    const averageTicket = data.bookings_aggregate.aggregate.avg.total_amount || 0
    const confirmedBookings = data.confirmed.aggregate.count || 0
    const confirmationRate = totalBookings > 0 ? ((confirmedBookings / totalBookings) * 100).toFixed(1) : 0

    const vehicleMap = new Map()
    data.bookings.forEach((booking: any) => {
      const key = booking.vehicle.id
      if (!vehicleMap.has(key)) {
        vehicleMap.set(key, {
          brand: booking.vehicle.brand,
          model: booking.vehicle.model,
          bookings: 0,
          revenue: 0
        })
      }
      const vehicle = vehicleMap.get(key)
      vehicle.bookings++
      vehicle.revenue += booking.total_amount
    })

    const vehiclePerformance = Array.from(vehicleMap.values())
      .sort((a, b) => b.revenue - a.revenue)

    const financialData = {
      totalRevenue,
      totalBookings,
      averageTicket,
      confirmedBookings,
      confirmationRate,
      vehiclePerformance,
      period: startDate && endDate ? `${startDate} a ${endDate}` : 'Todos os períodos'
    }

    console.log('Sending response:', financialData)

    return NextResponse.json(financialData)
  } catch (error: any) {
    console.error('Error in financial report:', error)
    return NextResponse.json({ error: error.message || 'Erro ao gerar relatório financeiro' }, { status: 500 })
  }
}

import { createServerClient } from '@/lib/nhost/server'
import { StatsCard } from '@/components/admin/stats-card'
import { redirect } from 'next/navigation'
import { gql } from 'graphql-request'

export default async function AdminDashboard() {
  const nhost = await createServerClient()
  
  const user = nhost.auth.getUser()
  if (!user) redirect('/auth/signin')

  const query = gql`
    query GetStats {
      vehicles_aggregate {
        aggregate {
          count
        }
      }
      bookings_aggregate(where: { status: { _eq: "active" } }) {
        aggregate {
          count
        }
      }
      bookings(where: { payment_status: { _eq: "paid" } }) {
        total_amount
      }
    }
  `

  const result = await nhost.graphql.request(query)
  
  const vehicleCount = result.vehicles_aggregate.aggregate.count
  const bookingCount = result.bookings_aggregate.aggregate.count
  const totalRevenue = result.bookings.reduce((sum: number, b: any) => sum + b.total_amount, 0)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Dashboard Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Veículos" value={vehicleCount} />
        <StatsCard title="Reservas Ativas" value={bookingCount} />
        <StatsCard title="Receita" value={`R$ ${totalRevenue.toFixed(2)}`} />
      </div>
    </div>
  )
}
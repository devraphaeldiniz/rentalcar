import { nhost } from '@/lib/nhost/client'
import { GET_VEHICLES } from '@/lib/graphql/queries'
import { VehicleCard } from '@/components/client/vehicle-card'
import { Vehicle } from '@/types/database.types'

export default async function HomePage() {
  const result = await nhost.graphql.request(GET_VEHICLES, {
    status: 'available'
  })

  const vehicles = result.vehicles as Vehicle[]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Alugue seu veículo</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {vehicles?.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} />
        ))}
      </div>
    </div>
  )
}
import { VehicleCard } from '@/components/client/vehicle-card'
import { Vehicle } from '@/types/database.types'

async function getVehicles() {
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.nhost.run/v1/graphql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetVehicles {
              vehicles(where: { status: { _eq: "available" } }) {
                id
                brand
                model
                year
                plate
                category
                daily_rate
                status
                image_url
                features
                created_at
              }
            }
          `
        }),
        cache: 'no-store'
      }
    )

    const { data } = await response.json()
    return data?.vehicles || []
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return []
  }
}

export default async function HomePage() {
  const vehicles = await getVehicles() as Vehicle[]

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Alugue seu veículo</h1>
      {vehicles.length === 0 ? (
        <p className="text-center text-muted-foreground">Nenhum veículo disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
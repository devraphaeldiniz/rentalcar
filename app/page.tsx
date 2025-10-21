import { VehicleCard } from '@/components/client/vehicle-card'
import { Vehicle } from '@/types/database.types'

async function getVehicles() {
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
    
    const response = await fetch(url, {
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
              images
              features
              created_at
            }
          }
        `
      }),
      cache: 'no-store'
    })

    const result = await response.json()
    
    return result.data?.vehicles || []
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
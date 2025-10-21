import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Vehicle } from '@/types/database.types'
import { ImageCarousel } from '@/components/client/image-carousel'
import { BookingForm } from '@/components/client/booking-form'
import { ArrowLeft, Users, Fuel, Settings, Calendar, Check } from 'lucide-react'

async function getVehicle(id: string) {
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetVehicle($id: uuid!) {
            vehicles_by_pk(id: $id) {
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
              description
              transmission
              fuel_type
              passengers
              doors
              air_conditioning
              trunk_capacity
              created_at
            }
          }
        `,
        variables: { id }
      }),
      cache: 'no-store'
    })

    const result = await response.json()
    return result.data?.vehicles_by_pk || null
  } catch (error) {
    console.error('Error fetching vehicle:', error)
    return null
  }
}

export default async function VehicleDetailPage({ params }: { params: { id: string } }) {
  const vehicle = await getVehicle(params.id) as Vehicle | null

  if (!vehicle) {
    notFound()
  }

  const displayImages = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images 
    : vehicle.image_url 
    ? [vehicle.image_url] 
    : []

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Imagens */}
        <div>
          <div className="w-full h-96 mb-4">
            {displayImages.length > 0 ? (
              <div className="relative w-full h-full">
                <ImageCarousel 
                  images={displayImages} 
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  height="h-96"
                />
              </div>
            ) : (
              <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Sem imagem</p>
              </div>
            )}
          </div>
        </div>

        {/* Informações */}
        <div>
          <div className="mb-6">
            <Badge className="mb-2">{vehicle.category}</Badge>
            <h1 className="text-4xl font-bold mb-2">
              {vehicle.brand} {vehicle.model}
            </h1>
            <p className="text-muted-foreground text-lg">{vehicle.year}</p>
          </div>

          <div className="mb-6">
            <BookingForm 
              vehicleId={vehicle.id}
              dailyRate={vehicle.daily_rate}
              vehicleName={`${vehicle.brand} ${vehicle.model} ${vehicle.year}`}
            />
          </div>

          {/* Especificações */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Especificações</h3>
              <div className="grid grid-cols-2 gap-4">
                {vehicle.passengers && (
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Passageiros</p>
                      <p className="font-medium">{vehicle.passengers}</p>
                    </div>
                  </div>
                )}
                {vehicle.transmission && (
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Câmbio</p>
                      <p className="font-medium">{vehicle.transmission}</p>
                    </div>
                  </div>
                )}
                {vehicle.fuel_type && (
                  <div className="flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Combustível</p>
                      <p className="font-medium">{vehicle.fuel_type}</p>
                    </div>
                  </div>
                )}
                {vehicle.doors && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Portas</p>
                      <p className="font-medium">{vehicle.doors}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Descrição */}
          {vehicle.description && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Sobre este veículo</h3>
                <p className="text-muted-foreground">{vehicle.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Características */}
          {vehicle.features && vehicle.features.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Características</h3>
                <div className="grid grid-cols-2 gap-3">
                  {vehicle.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
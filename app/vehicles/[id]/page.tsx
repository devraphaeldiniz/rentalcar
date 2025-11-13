'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, Fuel, Gauge, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewList } from '@/components/reviews/review-list'
import Link from 'next/link'

interface Vehicle {
  id: string
  brand: string
  model: string
  year: number
  daily_rate: number
  image_url: string
  images?: string[]
  plate: string
  color: string
  category: string
  status: string
  average_rating?: number
  total_reviews?: number
}

export default function VehicleDetailPage() {
  const params = useParams()
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    loadVehicle()
  }, [params.id])

  const loadVehicle = async () => {
    try {
      const response = await fetch(`/api/vehicles/${params.id}`)
      const data = await response.json()
      setVehicle(data)
    } catch (error) {
      console.error('Error loading vehicle:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-8" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground">Veículo não encontrado</p>
      </div>
    )
  }

  const images = vehicle.images || (vehicle.image_url ? [vehicle.image_url] : [])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Galeria de Imagens */}
          <div className="space-y-4">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Sem imagem</p>
                </div>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-video rounded overflow-hidden ${
                      idx === currentImageIndex ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações */}
          <div>
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">
                {vehicle.brand} {vehicle.model}
              </h1>
              <div className="flex items-center gap-4">
                <Badge>{vehicle.year}</Badge>
                <Badge variant="outline">{vehicle.category}</Badge>
                {vehicle.average_rating && vehicle.total_reviews ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{vehicle.average_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({vehicle.total_reviews})</span>
                  </div>
                ) : null}
              </div>
            </div>

            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="text-3xl font-bold text-primary mb-2">
                  R$ {vehicle.daily_rate}/dia
                </div>
                <p className="text-muted-foreground mb-4">
                  Valor da diária
                </p>
                <Link href={`/vehicles/${vehicle.id}/checkout`}>
                  <Button size="lg" className="w-full">
                    <Calendar className="mr-2 h-5 w-5" />
                    Reservar Agora
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Especificações</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <span>Placa: {vehicle.plate}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Fuel className="h-5 w-5 text-muted-foreground" />
                    <span>Cor: {vehicle.color}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span>Categoria: {vehicle.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-muted-foreground" />
                    <span>Status: {vehicle.status === 'available' ? 'Disponível' : 'Indisponível'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Avaliações */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Avaliações</h2>
          <ReviewList vehicleId={vehicle.id} />
        </div>
      </div>
    </div>
  )
}

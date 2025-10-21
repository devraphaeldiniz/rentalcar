'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Vehicle } from '@/types/database.types'
import { ImageCarousel } from './image-carousel'

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const displayImages = vehicle.images && vehicle.images.length > 0 
    ? vehicle.images 
    : vehicle.image_url 
    ? [vehicle.image_url] 
    : []

  return (
    <Card>
      <CardHeader className="p-0">
        <ImageCarousel 
          images={displayImages} 
          alt={`${vehicle.brand} ${vehicle.model}`} 
        />
      </CardHeader>
      <CardContent className="pt-4">
        <CardTitle className="mb-2">{vehicle.brand} {vehicle.model}</CardTitle>
        <p className="text-sm text-muted-foreground mb-2">{vehicle.year}</p>
        <Badge>{vehicle.category}</Badge>
        <p className="text-2xl font-bold mt-4">R$ {vehicle.daily_rate}/dia</p>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/vehicles/${vehicle.id}`}>Reservar</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
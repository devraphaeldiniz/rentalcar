import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import Image from 'next/image'
import { Vehicle } from '@/types/database.types'

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Card>
      <CardHeader>
        {vehicle.image_url && (
          <Image
            src={vehicle.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            width={400}
            height={250}
            className="rounded-lg object-cover w-full h-48"
          />
        )}
      </CardHeader>
      <CardContent>
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
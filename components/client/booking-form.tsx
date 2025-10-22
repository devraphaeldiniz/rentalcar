'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

type BookingFormProps = {
  vehicleId: string
  dailyRate: number
  vehicleName: string
}

export function BookingForm({ vehicleId, dailyRate, vehicleName }: BookingFormProps) {
  const router = useRouter()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Diária a partir de</p>
            <p className="text-3xl font-bold">
              R$ {dailyRate.toLocaleString('pt-BR')}
            </p>
          </div>
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => router.push(`/vehicles/${vehicleId}/checkout`)}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Reservar Agora
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Reserva sem compromisso • Cancelamento grátis
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

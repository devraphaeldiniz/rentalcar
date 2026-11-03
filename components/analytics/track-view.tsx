'use client'

import { useEffect } from 'react'
import { track } from '@/lib/analytics/client'

/** Marca que a pessoa abriu a página de um carro. */
export function TrackVehicleView({ vehicleId, category, dailyRate }: { vehicleId: string; category: string; dailyRate: number }) {
  useEffect(() => {
    track('view_vehicle', { vehicleId, meta: { category, rate: dailyRate } })
  }, [vehicleId, category, dailyRate])
  return null
}

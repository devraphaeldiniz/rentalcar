'use server'

import { createServerClient } from '@/lib/nhost/server'
import { vehicleSchema, VehicleInput } from '@/lib/validations/vehicle'
import { INSERT_VEHICLE, UPDATE_VEHICLE, DELETE_VEHICLE } from '@/lib/graphql/mutations'
import { revalidatePath } from 'next/cache'

export async function createVehicle(data: VehicleInput) {
  const nhost = await createServerClient()
  
  const user = nhost.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const validated = vehicleSchema.parse(data)

  try {
    const result = await nhost.graphql.request(INSERT_VEHICLE, {
      object: validated
    })

    revalidatePath('/admin/vehicles')
    return { data: result.insert_vehicles_one }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateVehicle(id: string, data: Partial<VehicleInput>) {
  const nhost = await createServerClient()
  
  const user = nhost.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const validated = vehicleSchema.partial().parse(data)

  try {
    await nhost.graphql.request(UPDATE_VEHICLE, {
      id,
      set: validated
    })

    revalidatePath('/admin/vehicles')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function deleteVehicle(id: string) {
  const nhost = await createServerClient()
  
  try {
    await nhost.graphql.request(DELETE_VEHICLE, { id })
    revalidatePath('/admin/vehicles')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
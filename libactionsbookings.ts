'use server'

import { createServerClient } from '@/lib/nhost/server'
import { bookingSchema, BookingInput } from '@/lib/validations/booking'
import { INSERT_BOOKING, UPDATE_BOOKING_STATUS } from '@/lib/graphql/mutations'
import { GET_VEHICLE } from '@/lib/graphql/queries'
import { revalidatePath } from 'next/cache'
import { differenceInDays } from 'date-fns'

export async function createBooking(data: BookingInput) {
  const nhost = await createServerClient()
  
  const user = nhost.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const validated = bookingSchema.parse(data)

  try {
    const vehicleResult = await nhost.graphql.request(GET_VEHICLE, {
      id: validated.vehicle_id
    })

    const vehicle = vehicleResult.vehicles_by_pk
    if (!vehicle || vehicle.status !== 'available') {
      return { error: 'Veículo indisponível' }
    }

    const days = differenceInDays(new Date(validated.end_date), new Date(validated.start_date))
    const total_amount = days * vehicle.daily_rate

    const result = await nhost.graphql.request(INSERT_BOOKING, {
      object: {
        user_id: user.id,
        vehicle_id: validated.vehicle_id,
        start_date: validated.start_date,
        end_date: validated.end_date,
        total_amount,
        notes: validated.notes,
      }
    })

    revalidatePath('/bookings')
    return { data: result.insert_bookings_one }
  } catch (error: any) {
    return { error: error.message }
  }
}

export async function updateBookingStatus(id: string, status: string) {
  const nhost = await createServerClient()
  
  const user = nhost.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  try {
    await nhost.graphql.request(UPDATE_BOOKING_STATUS, { id, status })
    revalidatePath('/admin/bookings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message }
  }
}
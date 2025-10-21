'use server'

import { bookingSchema, BookingInput } from '@/lib/validations/booking'
import { revalidatePath } from 'next/cache'
import { differenceInDays } from 'date-fns'

export async function createBooking(data: BookingInput) {
  try {
    const validated = bookingSchema.parse(data)

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    // Buscar veículo
    const vehicleResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query GetVehicle($id: uuid!) {
            vehicles_by_pk(id: $id) {
              id
              daily_rate
              status
            }
          }
        `,
        variables: { id: validated.vehicle_id }
      }),
    })

    const vehicleResult = await vehicleResponse.json()
    const vehicle = vehicleResult.data?.vehicles_by_pk

    if (!vehicle || vehicle.status !== 'available') {
      return { error: 'Veículo indisponível' }
    }

    // Calcular total
    const days = differenceInDays(new Date(validated.end_date), new Date(validated.start_date))
    const total_amount = days * vehicle.daily_rate

    // Criar reserva
    const bookingResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation InsertBooking($object: bookings_insert_input!) {
            insert_bookings_one(object: $object) {
              id
              total_amount
              status
            }
          }
        `,
        variables: {
          object: {
            vehicle_id: validated.vehicle_id,
            start_date: validated.start_date,
            end_date: validated.end_date,
            total_amount,
            customer_name: validated.customer_name,
            customer_email: validated.customer_email,
            customer_phone: validated.customer_phone,
            customer_cpf: validated.customer_cpf,
            status: 'pending',
          }
        }
      }),
    })

    const bookingResult = await bookingResponse.json()

    if (bookingResult.errors) {
      return { error: bookingResult.errors[0].message }
    }

    revalidatePath('/bookings')
    return { data: bookingResult.data.insert_bookings_one }
  } catch (error: any) {
    return { error: error.message || 'Erro ao criar reserva' }
  }
}
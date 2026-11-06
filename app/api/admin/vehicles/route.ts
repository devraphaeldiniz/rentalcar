export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { pickVehicleFields } from '@/lib/vehicle-fields'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetVehicles {
            vehicles(order_by: { created_at: desc }) {
              id
              brand
              model
              year
              plate
              daily_rate
              category
              status
              images
              features
              created_at
            }
          }
        `
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return viewerJson(viewer, 
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    return viewerJson(viewer, { vehicles: result.data?.vehicles || [] })
  } catch (error) {
    return viewerJson(viewer, 
      { error: 'Erro ao buscar veículos' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await req.json()

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation CreateVehicle($object: vehicles_insert_input!) {
            insert_vehicles_one(object: $object) {
              id
            }
          }
        `,
        variables: { object: pickVehicleFields(data) }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar veículo' },
      { status: 500 }
    )
  }
}

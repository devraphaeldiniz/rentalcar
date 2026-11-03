export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'

// Campos que o painel pode alterar; o resto (id, notas, datas) fica protegido.
const EDITABLE = ['brand', 'model', 'year', 'plate', 'category', 'daily_rate', 'status', 'description', 'transmission',
  'fuel_type', 'passengers', 'doors', 'trunk_capacity', 'air_conditioning', 'color', 'features', 'images', 'image_url'] as const

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ vehicles_by_pk: unknown }>(
      `query AdminVehicle($id: uuid!) { vehicles_by_pk(id: $id) { id ${EDITABLE.join(' ')} image_credits } }`,
      { id: params.id },
    )
    if (!data.vehicles_by_pk) return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    return NextResponse.json({ vehicle: data.vehicles_by_pk })
  } catch (error) {
    console.error('[admin/vehicles/:id GET]', error)
    return NextResponse.json({ error: 'Erro ao carregar o veículo' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const body = await req.json()
    const { id: vehicleId } = await params
    const data = Object.fromEntries(Object.entries(body ?? {}).filter(([k]) => (EDITABLE as readonly string[]).includes(k)))
    if (data.daily_rate !== undefined && !(Number(data.daily_rate) > 0)) {
      return NextResponse.json({ error: 'A diária precisa ser maior que zero.' }, { status: 400 })
    }

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateVehicle($id: uuid!, $_set: vehicles_set_input!) {
            update_vehicles_by_pk(
              pk_columns: { id: $id }
              _set: $_set
            ) {
              id
            }
          }
        `,
        variables: { id: vehicleId, _set: data }
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
      { error: 'Erro ao atualizar veículo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const { id: vehicleId } = await params

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation DeleteVehicle($id: uuid!) {
            delete_vehicles_by_pk(id: $id) {
              id
            }
          }
        `,
        variables: { id: vehicleId }
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
      { error: 'Erro ao deletar veículo' },
      { status: 500 }
    )
  }
}

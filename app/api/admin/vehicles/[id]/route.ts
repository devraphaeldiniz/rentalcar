import { NextRequest, NextResponse } from 'next/server'

// GET - Buscar veículo por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          query GetVehicle($id: uuid!) {
            vehicles_by_pk(id: $id) {
              id
              brand
              model
              year
              plate
              category
              daily_rate
              status
              description
              transmission
              fuel_type
              passengers
              doors
              trunk_capacity
              features
              images
            }
          }
        `,
        variables: { id }
      }),
    })

    const result = await response.json()

    if (result.errors) {
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    return NextResponse.json(result.data?.vehicles_by_pk || null)
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar veículo' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar veículo
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const data = await req.json()

    console.log('=== UPDATE VEHICLE ===')
    console.log('ID:', id)
    console.log('Data:', data)

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateVehicle($id: uuid!, $set: vehicles_set_input!) {
            update_vehicles_by_pk(pk_columns: { id: $id }, _set: $set) {
              id
              brand
              model
            }
          }
        `,
        variables: {
          id,
          set: data
        }
      }),
    })

    const result = await response.json()
    console.log('GraphQL Response:', result)

    if (result.errors) {
      console.error('GraphQL Errors:', result.errors)
      return NextResponse.json(
        { error: result.errors[0].message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Deletar veículo
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

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
        variables: { id }
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

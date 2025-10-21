import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    
    console.log('=== API CREATE VEHICLE ===')
    console.log('Received data:', data)

    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    console.log('GraphQL URL:', url)
    console.log('Has Admin Secret:', !!process.env.NHOST_ADMIN_SECRET)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
      },
      body: JSON.stringify({
        query: `
          mutation InsertVehicle($object: vehicles_insert_input!) {
            insert_vehicles_one(object: $object) {
              id
              brand
              model
            }
          }
        `,
        variables: {
          object: data
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

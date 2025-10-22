import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const adminSecret = process.env.NHOST_ADMIN_SECRET
    const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN
    const region = process.env.NEXT_PUBLIC_NHOST_REGION
    
    console.log('=== DEBUG INFO ===')
    console.log('Admin secret exists:', !!adminSecret)
    console.log('Admin secret length:', adminSecret?.length)
    console.log('Subdomain:', subdomain)
    console.log('Region:', region)
    
    const url = `https://${subdomain}.graphql.${region}.nhost.run/v1`
    console.log('URL:', url)

    const query = `
      query GetAllProfiles {
        profiles(order_by: { created_at: desc }) {
          id
          email
          full_name
          role
        }
      }
    `

    console.log('Sending query with admin secret...')
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret!,
      },
      body: JSON.stringify({ query }),
    })

    const result = await response.json()
    console.log('Full response:', JSON.stringify(result, null, 2))

    return NextResponse.json({
      debug: {
        hasAdminSecret: !!adminSecret,
        url,
      },
      result
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

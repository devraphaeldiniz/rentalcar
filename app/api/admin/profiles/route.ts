export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
    },
    body: JSON.stringify({
      query: `
        query GetProfiles {
          profiles(order_by: { created_at: desc }) {
            id
            full_name
            phone
            cpf
            email
            email_verified
            role
            created_at
            blocked
          }
        }
      `
    }),
  })

  const result = await response.json()

  if (result.errors) {
    return viewerJson(viewer, { error: result.errors[0].message }, { status: 500 })
  }

  return viewerJson(viewer, { profiles: result.data?.profiles || [] })
}

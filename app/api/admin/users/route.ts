export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

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
          query GetUsers {
            users(order_by: { createdAt: desc }) {
              id
              email
              displayName
              emailVerified
              createdAt
              metadata
              defaultRole
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

    return viewerJson(viewer, { users: result.data?.users || [] })
  } catch (error) {
    return viewerJson(viewer, 
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

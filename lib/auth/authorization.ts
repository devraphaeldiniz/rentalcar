import { cookies } from 'next/headers'

function graphqlUrl() {
  return `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`
}

async function refreshToken(refreshToken: string) {
  const response = await fetch(`https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.auth.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
  })
  if (!response.ok) return null
  const data = await response.json()
  return data.session?.accessToken ?? null
}

export async function requireUser() {
  const store = await cookies()
  let token = store.get('token')?.value
  if (!token) {
    const refresh = store.get('nhostRefreshToken')?.value
    if (refresh) token = await refreshToken(refresh)
  }
  if (!token) return null

  // Valida o token no Nhost Auth em vez de só decodificar o JWT:
  // um token montado à mão (sem assinatura válida) é recusado aqui.
  try {
    const response = await fetch(`https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.auth.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/user`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const user = await response.json()
    if (!user?.id) return null
    return { userId: user.id as string, email: (user.email ?? null) as string | null, token }
  } catch {
    return null
  }
}

export async function requireAdmin() {
  const user = await requireUser()
  if (!user) return null
  const response = await fetch(graphqlUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET! },
    body: JSON.stringify({ query: 'query UserRole($id: uuid!) { profiles_by_pk(id: $id) { role } }', variables: { id: user.userId } }),
  })
  if (!response.ok) return null
  const result = await response.json()
  return result.data?.profiles_by_pk?.role === 'admin' ? user : null
}

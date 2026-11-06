import { cookies } from 'next/headers'
import { isDemoAdminAccount } from '@/lib/demo'

// Único ponto de verdade sobre "quem é o usuário" no servidor.
// Nenhuma rota deve decodificar o JWT por conta própria: só um token
// validado pelo Nhost Auth é aceito, e o papel vem de profiles.role.

const SUBDOMAIN = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN
const REGION = process.env.NEXT_PUBLIC_NHOST_REGION

export const authUrl = (path: string) => `https://${SUBDOMAIN}.auth.${REGION}.nhost.run/v1${path}`
export const graphqlUrl = () => `https://${SUBDOMAIN}.graphql.${REGION}.nhost.run/v1`

export const ACCESS_COOKIE = 'token'
export const REFRESH_COOKIE = 'nhostRefreshToken'
export const ACCESS_MAX_AGE = 60 * 15
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export type NhostUser = {
  id: string
  email?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  emailVerified?: boolean
  phoneNumber?: string | null
  createdAt?: string
}

export type AuthUser = {
  userId: string
  email: string | null
  token: string
  user: NhostUser
}

async function fetchNhostUser(token: string): Promise<NhostUser | null> {
  try {
    const response = await fetch(authUrl('/user'), {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return null
    const user = await response.json()
    return user?.id ? user : null
  } catch {
    return null
  }
}

async function refreshSession(refreshToken: string) {
  try {
    const response = await fetch(authUrl('/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const data = await response.json()
    const session = data?.session ?? data
    if (!session?.accessToken) return null
    return session as { accessToken: string; refreshToken?: string; user?: NhostUser }
  } catch {
    return null
  }
}

export async function requireUser(): Promise<AuthUser | null> {
  const store = await cookies()

  const access = store.get(ACCESS_COOKIE)?.value
  if (access) {
    const user = await fetchNhostUser(access)
    if (user) return { userId: user.id, email: user.email ?? null, token: access, user }
  }

  // Access token ausente ou expirado: renova com o refresh token.
  const refresh = store.get(REFRESH_COOKIE)?.value
  if (!refresh) return null

  const session = await refreshSession(refresh)
  if (!session) return null

  // O Nhost rotaciona o refresh token: grava o novo para a sessão não cair.
  // Em Server Components o set lança erro; nas rotas de API funciona.
  try {
    store.set(ACCESS_COOKIE, session.accessToken, cookieOptions(ACCESS_MAX_AGE))
    if (session.refreshToken) store.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE))
  } catch {}

  const user = await fetchNhostUser(session.accessToken)
  if (!user) return null
  return { userId: user.id, email: user.email ?? null, token: session.accessToken, user }
}

export async function adminGraphql<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(graphqlUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': process.env.NHOST_ADMIN_SECRET!,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  })
  const result = await response.json()
  if (!response.ok || result.errors) {
    throw new Error(result.errors?.[0]?.message ?? `GraphQL HTTP ${response.status}`)
  }
  return result.data as T
}

export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  try {
    const data = await adminGraphql<{ profiles_by_pk: { role: string } | null }>(
      'query UserRole($id: uuid!) { profiles_by_pk(id: $id) { role } }',
      { id: userId },
    )
    return data.profiles_by_pk?.role === 'admin' ? 'admin' : 'user'
  } catch {
    return 'user'
  }
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await requireUser()
  if (!user) return null
  return (await getUserRole(user.userId)) === 'admin' ? user : null
}

export type AdminViewer = AuthUser & { demo: boolean }

/**
 * Quem pode VER o painel: admins e a conta de demonstração do admin (DEMO_ADMIN_EMAIL).
 * A conta de demonstração tem papel "client" no banco, então qualquer rota que altera algo
 * (requireAdmin) continua recusando: o modo demonstração é só leitura por construção.
 */
export async function requireAdminView(): Promise<AdminViewer | null> {
  const user = await requireUser()
  if (!user) return null
  if ((await getUserRole(user.userId)) === 'admin') return { ...user, demo: false }
  return isDemoAdminAccount(user.email) ? { ...user, demo: true } : null
}

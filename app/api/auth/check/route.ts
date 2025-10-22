import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

async function getAccessToken(refreshToken: string) {
  try {
    const response = await fetch(
      `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.auth.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }
    )
    const data = await response.json()
    return data.session?.accessToken
  } catch (error) {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    let token = cookieStore.get('token')?.value

    if (!token) {
      const refreshToken = cookieStore.get('nhostRefreshToken')?.value
      if (refreshToken) {
        token = await getAccessToken(refreshToken)
      }
    }

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Decodificar token e pegar role DIRETO do token
    const payload = JSON.parse(atob(token.split('.')[1]))
    const claims = payload['https://hasura.io/jwt/claims']
    const user_id = claims?.['x-hasura-user-id'] || payload.sub
    const userRole = claims?.['x-hasura-default-role'] || 'user'

    console.log('[API /auth/check] User ID:', user_id)
    console.log('[API /auth/check] Role from token:', userRole)

    // Buscar usuário
    const url = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.graphql.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query GetUser($id: uuid!) {
            user(id: $id) {
              id
              email
              displayName
              emailVerified
              phoneNumber
              avatarUrl
              createdAt
            }
          }
        `,
        variables: { id: user_id }
      }),
    })

    const result = await response.json()
    const user = result.data?.user

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Usar role do TOKEN, não do metadata
    const userData = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      role: userRole, // Role do token JWT
      createdAt: user.createdAt,
    }

    console.log('[API /auth/check] Returning user:', userData)

    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error('[API /auth/check] Error:', error)
    return NextResponse.json({ error: 'Error checking auth' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Pegar token do header
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Decodificar token
    const payload = JSON.parse(atob(token.split('.')[1]))
    const user_id = payload['https://hasura.io/jwt/claims']?.['x-hasura-user-id'] || payload.sub

    if (!user_id) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

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
              metadata
            }
          }
        `,
        variables: { id: user_id }
      }),
    })

    const result = await response.json()
    const user = result.data?.user

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        role: user.metadata?.role || 'user',
        createdAt: user.createdAt,
      }
    })
  } catch (error: any) {
    console.error('Auth me error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar autenticação' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
    }

    const nhostUrl = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.auth.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/signin/email-password`

    const response = await fetch(nhostUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Nhost signin failed')
      return NextResponse.json(
        { error: data.message || 'Credenciais invalidas' },
        { status: 401 }
      )
    }

    if (data.session) {
      const token = data.session.accessToken
      const refreshToken = data.session.refreshToken

      const res = NextResponse.json({ success: true })

      res.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      res.cookies.set('nhostRefreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })

      return res
    }

    console.error('No session in response')
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  console.log('=== API SIGNIN CALLED ===')
  
  try {
    const { email, password } = await req.json()
    console.log('Email:', email)

    console.log('Calling Nhost signin...')
    const nhostUrl = `https://${process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN}.auth.${process.env.NEXT_PUBLIC_NHOST_REGION}.nhost.run/v1/signin/email-password`
    console.log('Nhost URL:', nhostUrl)
    
    const response = await fetch(nhostUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await response.json()
    console.log('Nhost response status:', response.status)
    console.log('Nhost response data:', data)

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

      console.log('Got tokens!')
      console.log('Access token:', token ? 'exists' : 'missing')
      console.log('Refresh token:', refreshToken ? 'exists' : 'missing')

      const res = NextResponse.json({ success: true })

      res.cookies.set('token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      })

      res.cookies.set('nhostRefreshToken', refreshToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })

      console.log('Cookies set!')
      console.log('=== LOGIN SUCCESS ===')

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

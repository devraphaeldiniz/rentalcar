export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { authUrl, cookieOptions, ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth/authorization'

// Os cookies de sessão são httpOnly: o navegador não consegue apagá-los,
// então o logout precisa passar pelo servidor.
export async function POST() {
  const store = await cookies()
  const refreshToken = store.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    // Revoga o refresh token no Nhost para ele não poder ser reutilizado.
    try {
      await fetch(authUrl('/signout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      })
    } catch (error) {
      console.error('[signout] falha ao revogar no Nhost:', error)
    }
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(ACCESS_COOKIE, '', cookieOptions(0))
  res.cookies.set(REFRESH_COOKIE, '', cookieOptions(0))
  return res
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE, authUrl, cookieOptions } from '@/lib/auth/authorization'
import { demoCredentials, demoEnabled } from '@/lib/demo'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

// Limite por IP e por instância: evita que alguém use a rota para sobrecarregar o login.
const WINDOW = 10 * 60 * 1000
const MAX_PER_WINDOW = 10
const hits = new Map<string, { n: number; reset: number }>()
function allowed(ip: string) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || h.reset < now) {
    if (hits.size > 5000) hits.clear()
    hits.set(ip, { n: 1, reset: now + WINDOW })
    return true
  }
  h.n += 1
  return h.n <= MAX_PER_WINDOW
}

/** Diz ao formulário de login se o botão de demonstração deve aparecer. */
export async function GET() {
  return NextResponse.json({ enabled: demoEnabled() })
}

/** Entra na conta de demonstração. As credenciais nunca saem do servidor. */
export async function POST() {
  if (!demoEnabled()) return NextResponse.json({ error: 'Demonstração indisponível no momento.' }, { status: 404 })
  const ip = await getClientIP()
  if (!allowed(ip)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 })

  try {
    const response = await fetch(authUrl('/signin/email-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(demoCredentials()),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    const session = data?.session
    if (!response.ok || !session?.accessToken) {
      console.error('[demo] login recusado:', response.status, data?.error)
      return NextResponse.json({ error: 'Demonstração indisponível no momento.' }, { status: 503 })
    }
    await createAuditLog({ userId: session.user?.id, action: 'user.login', ipAddress: ip, userAgent: await getUserAgent(), metadata: { demo: true } })
    const res = NextResponse.json({ success: true })
    res.cookies.set(ACCESS_COOKIE, session.accessToken, cookieOptions(ACCESS_MAX_AGE))
    res.cookies.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE))
    return res
  } catch (error) {
    console.error('[demo]', error)
    return NextResponse.json({ error: 'Demonstração indisponível no momento.' }, { status: 503 })
  }
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE, authUrl, cookieOptions } from '@/lib/auth/authorization'
import { demoAdminCredentials, demoAdminEnabled, demoCredentials, demoEnabled } from '@/lib/demo'
import { DEMO_ADMIN_COOKIE } from '@/lib/demo-admin'
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

/** Diz ao formulário de login quais botões de demonstração devem aparecer. */
export async function GET() {
  return NextResponse.json({ enabled: demoEnabled(), admin: demoAdminEnabled() })
}

/**
 * Entra numa conta de demonstração: a de cliente ou, com { as: "admin" }, a do painel
 * (só leitura e sem dados pessoais). As credenciais nunca saem do servidor.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { as?: string }
  const asAdmin = body?.as === 'admin'
  if (!(asAdmin ? demoAdminEnabled() : demoEnabled())) return NextResponse.json({ error: 'Demonstração indisponível no momento.' }, { status: 404 })
  const ip = await getClientIP()
  if (!allowed(ip)) return NextResponse.json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, { status: 429 })

  try {
    const response = await fetch(authUrl('/signin/email-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(asAdmin ? demoAdminCredentials() : demoCredentials()),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    const session = data?.session
    if (!response.ok || !session?.accessToken) {
      console.error('[demo] login recusado:', response.status, data?.error)
      return NextResponse.json({ error: 'Demonstração indisponível no momento.' }, { status: 503 })
    }
    await createAuditLog({ userId: session.user?.id, action: 'user.login', ipAddress: ip, userAgent: await getUserAgent(), metadata: { demo: asAdmin ? 'admin' : 'client' } })
    const res = NextResponse.json({ success: true })
    res.cookies.set(ACCESS_COOKIE, session.accessToken, cookieOptions(ACCESS_MAX_AGE))
    res.cookies.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE))
    // Só um aviso para o middleware responder com uma mensagem clara; quem barra de verdade é o requireAdmin.
    res.cookies.set(DEMO_ADMIN_COOKIE, asAdmin ? '1' : '', cookieOptions(asAdmin ? REFRESH_MAX_AGE : 0))
    return res
  } catch (error) {
    console.error('[demo]', error)
    return NextResponse.json({ error: 'Demonstração indisponível no momento.' }, { status: 503 })
  }
}

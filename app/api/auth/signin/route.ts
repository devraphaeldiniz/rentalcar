export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { authUrl, adminGraphql, cookieOptions, ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_MAX_AGE, REFRESH_MAX_AGE } from '@/lib/auth/authorization'
import { checkLoginRateLimit, recordLoginAttempt } from '@/lib/security/rate-limit'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
  }

  const ip = await getClientIP()

  // O limite é aplicado aqui, no servidor, antes de falar com o Nhost.
  const limit = await checkLoginRateLimit(email, ip)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${limit.retryAfterMinutes} minutos.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterMinutes * 60) } },
    )
  }

  try {
    const response = await fetch(authUrl('/signin/email-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))
    const session = data?.session

    if (!response.ok || !session?.accessToken) {
      await recordLoginAttempt(email, ip, false, data?.error ?? `http_${response.status}`)
      if (data?.error === 'unverified-user') {
        return NextResponse.json({ error: 'Confirme seu e-mail pelo link que enviamos antes de entrar.' }, { status: 403 })
      }
      // Mensagem genérica: não revela se o e-mail existe.
      return NextResponse.json({ error: 'E-mail ou senha inválidos' }, { status: 401 })
    }

    await recordLoginAttempt(email, ip, true)

    // Garante o perfil (reservas e papel de admin dependem dele) caso o
    // trigger em auth.users não exista neste projeto.
    if (session.user?.id) {
      await adminGraphql(
        `mutation EnsureProfile($object: profiles_insert_input!) {
          insert_profiles_one(object: $object, on_conflict: { constraint: profiles_pkey, update_columns: [] }) { id }
        }`,
        { object: { id: session.user.id, email, full_name: session.user.displayName || null } },
      ).catch((error) => console.error('[signin] perfil:', error))
    }
    await createAuditLog({
      userId: session.user?.id,
      action: 'user.login',
      ipAddress: ip,
      userAgent: await getUserAgent(),
    })

    const res = NextResponse.json({ success: true })
    res.cookies.set(ACCESS_COOKIE, session.accessToken, cookieOptions(ACCESS_MAX_AGE))
    res.cookies.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE))
    return res
  } catch (error) {
    console.error('[signin]', error)
    return NextResponse.json({ error: 'Erro ao fazer login' }, { status: 500 })
  }
}

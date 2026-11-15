export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ACCESS_COOKIE, ACCESS_MAX_AGE, REFRESH_COOKIE, REFRESH_MAX_AGE, adminGraphql, authUrl, cookieOptions } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { SIGNUPS_PER_IP_MAX, recentSignupsByIp } from '@/lib/security/rate-limit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

const input = z.object({
  full_name: z.string().trim().min(2, 'Informe seu nome completo.').max(120),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(200),
  phone: z.string().trim().max(30).optional().default(''),
  password: z.string().min(9, 'A senha deve ter pelo menos 9 caracteres.').max(72, 'Use uma senha de até 72 caracteres.'),
})

// Respostas do Nhost Auth traduzidas para mensagens que o cliente entende.
const NHOST_ERRORS: Record<string, [number, string]> = {
  'email-already-in-use': [409, 'Já existe uma conta com esse e-mail. Tente entrar ou recuperar a senha.'],
  'password-in-hibp-database': [400, 'Essa senha já apareceu em vazamentos de dados na internet. Escolha outra.'],
  'password-too-short': [400, 'A senha deve ter pelo menos 9 caracteres.'],
  'invalid-email-password': [400, 'E-mail ou senha em formato inválido.'],
  'invalid-request': [400, 'Confira os dados e tente de novo.'],
  'signup-disabled': [403, 'Os cadastros estão temporariamente fechados.'],
  'disabled-endpoint': [403, 'Os cadastros estão temporariamente fechados.'],
  'redirectTo-not-allowed': [500, 'O cadastro está com um problema de configuração. Avise o atendimento.'],
}

// Limite simples por IP e por instância contra criação de contas em massa.
const WINDOW = 60 * 60 * 1000
const MAX_PER_WINDOW = 8
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

export async function POST(req: NextRequest) {
  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const issue = parsed.error.issues.find((i) => i.path.length > 0)
    return NextResponse.json({ error: issue?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { full_name, email, phone, password } = parsed.data

  const ip = await getClientIP()
  // Freio em memória (rajada, por instância) + teto no banco (vale entre instâncias).
  if (!allowed(ip) || (await recentSignupsByIp(ip)) >= SIGNUPS_PER_IP_MAX) {
    return NextResponse.json({ error: 'Muitos cadastros a partir desta conexão. Tente de novo mais tarde.' }, { status: 429 })
  }

  try {
    const response = await fetch(authUrl('/signup/email-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, options: { displayName: full_name, metadata: { phone } } }),
      cache: 'no-store',
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const code = String(data?.error ?? `http_${response.status}`)
      // Fica no log da Vercel para diagnóstico; o cliente recebe a versão em português.
      console.error('[signup] Nhost recusou:', response.status, code, data?.message ?? '')
      const [status, message] = NHOST_ERRORS[code] ?? [502, `Não foi possível criar a conta agora (${code}). Tente de novo em instantes.`]
      return NextResponse.json({ error: message }, { status })
    }

    const user = data?.session?.user ?? data?.user
    if (user?.id) {
      // Garante o perfil com nome e telefone, mesmo sem o trigger em auth.users.
      await adminGraphql(
        `mutation EnsureProfile($object: profiles_insert_input!) {
          insert_profiles_one(object: $object, on_conflict: { constraint: profiles_pkey, update_columns: [full_name, phone] }) { id }
        }`,
        { object: { id: user.id, email, full_name, phone: phone || null } },
      ).catch((error) => console.error('[signup] perfil:', error))
      await createAuditLog({ userId: user.id, action: 'user.register', ipAddress: ip, userAgent: await getUserAgent() })
    }

    // Sem confirmação de e-mail, o Nhost já devolve a sessão: a pessoa entra direto.
    const session = data?.session
    if (session?.accessToken) {
      const res = NextResponse.json({ success: true, signedIn: true })
      res.cookies.set(ACCESS_COOKIE, session.accessToken, cookieOptions(ACCESS_MAX_AGE))
      res.cookies.set(REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE))
      return res
    }
    return NextResponse.json({ success: true, signedIn: false })
  } catch (error) {
    console.error('[signup]', error)
    return NextResponse.json({ error: 'Sem conexão com o servidor de contas. Tente de novo em instantes.' }, { status: 503 })
  }
}

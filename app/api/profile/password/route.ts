export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, authUrl } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

const input = z.object({ newPassword: z.string().min(9, 'A senha precisa ter pelo menos 9 caracteres.').max(128) })

export async function POST(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 })

  // Troca feita pelo próprio Nhost Auth, com o token da sessão do usuário.
  const res = await fetch(authUrl('/user/password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify({ newPassword: parsed.data.newPassword }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg = body?.error === 'password-in-hibp-database'
      ? 'Essa senha aparece em vazamentos conhecidos. Escolha outra.'
      : 'Não foi possível trocar a senha. Tente outra.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  await createAuditLog({
    userId: auth.userId,
    action: 'user.password_reset',
    ipAddress: await getClientIP(),
    userAgent: await getUserAgent(),
  })
  return NextResponse.json({ success: true })
}

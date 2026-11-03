export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

const input = z.object({
  userId: z.string().uuid(),
  block: z.boolean(),
  reason: z.string().trim().max(300).optional(),
})

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { userId, block, reason } = parsed.data

  if (userId === admin.userId) {
    return NextResponse.json({ error: 'Você não pode bloquear a sua própria conta.' }, { status: 400 })
  }

  try {
    // Bloqueia no perfil (exibição) e no Nhost Auth (impede login e renovação de sessão).
    const data = await adminGraphql<{ update_profiles_by_pk: { id: string } | null }>(
      `mutation Block($id: uuid!, $blocked: Boolean!, $reason: String) {
        update_profiles_by_pk(pk_columns: { id: $id }, _set: { blocked: $blocked, blocked_reason: $reason }) { id }
        updateUser(pk_columns: { id: $id }, _set: { disabled: $blocked }) { id }
      }`,
      { id: userId, blocked: block, reason: block ? reason ?? null : null },
    )
    if (!data.update_profiles_by_pk) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    if (block) {
      // Encerra sessões abertas: sem refresh token válido, o usuário cai no próximo acesso.
      await adminGraphql(
        `mutation Revoke($id: uuid!) { deleteAuthRefreshTokens(where: { userId: { _eq: $id } }) { affected_rows } }`,
        { id: userId },
      ).catch((error) => console.error('[admin/users/block] revogar sessões:', error))
    }

    await createAuditLog({
      userId: admin.userId,
      action: 'admin.access',
      resource: block ? 'user.block' : 'user.unblock',
      resourceId: userId,
      ipAddress: await getClientIP(),
      userAgent: await getUserAgent(),
      metadata: reason ? { reason } : undefined,
    })
    return NextResponse.json({ success: true, blocked: block })
  } catch (error) {
    console.error('[admin/users/block]', error)
    return NextResponse.json({ error: 'Erro ao alterar o bloqueio' }, { status: 500 })
  }
}

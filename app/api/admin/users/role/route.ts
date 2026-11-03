export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

const input = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'client']),
})

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  const { userId, role } = parsed.data

  // Impede que o último acesso administrativo se tranque para fora.
  if (userId === admin.userId && role !== 'admin') {
    return NextResponse.json({ error: 'Você não pode remover o seu próprio acesso de administrador.' }, { status: 400 })
  }

  try {
    const data = await adminGraphql<{ update_profiles_by_pk: { id: string; role: string } | null }>(
      `mutation SetRole($id: uuid!, $role: String!) {
        update_profiles_by_pk(pk_columns: { id: $id }, _set: { role: $role }) { id role }
      }`,
      { id: userId, role },
    )
    if (!data.update_profiles_by_pk) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

    await createAuditLog({
      userId: admin.userId,
      action: 'admin.access',
      resource: 'profile.role',
      resourceId: userId,
      ipAddress: await getClientIP(),
      userAgent: await getUserAgent(),
      metadata: { role },
    })
    return NextResponse.json({ success: true, role: data.update_profiles_by_pk.role })
  } catch (error) {
    console.error('[admin/users/role]', error)
    return NextResponse.json({ error: 'Erro ao alterar o perfil de acesso' }, { status: 500 })
  }
}

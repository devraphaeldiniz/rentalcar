export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin } from '@/lib/auth/authorization'
import { isDuplicateCpf, profileInput } from '@/lib/profile-input'
import { createAuditLog } from '@/lib/security/audit'

/** O admin corrige nome, telefone e CPF de um cliente, com a mesma validação da tela do cliente. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
  const parsed = profileInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  const { fullName, phone, cpf } = parsed.data

  try {
    const data = await adminGraphql<{ update_profiles_by_pk: { id: string; full_name: string; phone: string | null; cpf: string | null } | null }>(
      `mutation UpdateProfile($id: uuid!, $set: profiles_set_input!, $name: String!) {
        update_profiles_by_pk(pk_columns: { id: $id }, _set: $set) { id full_name phone cpf }
        updateUser(pk_columns: { id: $id }, _set: { displayName: $name }) { id }
      }`,
      { id, set: { full_name: fullName, phone: phone || null, cpf: cpf || null }, name: fullName },
    )
    if (!data.update_profiles_by_pk) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    await createAuditLog({ userId: admin.userId, action: 'profile.updated', resource: 'profile', resourceId: id, metadata: { updated: ['full_name', 'phone', 'cpf'] } })
    return NextResponse.json({ success: true, profile: data.update_profiles_by_pk })
  } catch (error) {
    if (isDuplicateCpf(error)) return NextResponse.json({ error: 'Este CPF já está cadastrado em outra conta.' }, { status: 409 })
    console.error('[admin/profiles/:id PATCH]', error)
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}

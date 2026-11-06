export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { createAuditLog } from '@/lib/security/audit'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ rental_extras: unknown[] }>(
      `query AllExtras { rental_extras(order_by: [{ kind: desc }, { sort: asc }]) {
        id code kind name description price pricing max_total is_default active sort
      } }`,
    )
    return viewerJson(viewer, { extras: data.rental_extras })
  } catch (error) {
    console.error('[admin/extras]', error)
    return viewerJson(viewer, { error: 'Erro ao carregar proteções e opcionais' }, { status: 500 })
  }
}

const money = z.number().min(0).max(100000).transform((n) => Math.round(n * 100) / 100)
const patch = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).nullable().optional(),
  price: money.optional(),
  max_total: money.nullable().optional(),
  active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const parsed = patch.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Valores inválidos. Use números com até 2 casas decimais.' }, { status: 400 })
  const { id, ...changes } = parsed.data
  if (Object.keys(changes).length === 0) return NextResponse.json({ error: 'Nada para alterar' }, { status: 400 })

  try {
    const current = await adminGraphql<{ rental_extras_by_pk: { is_default: boolean; code: string } | null }>(
      `query One($id: uuid!) { rental_extras_by_pk(id: $id) { is_default code } }`,
      { id },
    )
    const extra = current.rental_extras_by_pk
    if (!extra) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
    // A proteção padrão sustenta todas as reservas: não pode ser desativada.
    if (extra.is_default && changes.active === false) {
      return NextResponse.json({ error: 'A proteção padrão não pode ser desativada.' }, { status: 400 })
    }
    await adminGraphql(
      `mutation Upd($id: uuid!, $set: rental_extras_set_input!) { update_rental_extras_by_pk(pk_columns: { id: $id }, _set: $set) { id } }`,
      { id, set: changes },
    )
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'rental_extra', resourceId: id, metadata: { code: extra.code, ...changes } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/extras PATCH]', error)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin } from '@/lib/auth/authorization'
import { isIsoDate } from '@/lib/rental'
import { createAuditLog } from '@/lib/security/audit'

const FIELDS = 'id kind name min_days start_date end_date percent active created_at'
const pct = z.number().finite().transform((n) => Math.round(n * 100) / 100)

const create = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('duration'), name: z.string().trim().min(2).max(80), min_days: z.number().int().min(2).max(90), percent: pct.pipe(z.number().gt(0).max(60)) }),
  z.object({
    kind: z.literal('season'),
    name: z.string().trim().min(2).max(80),
    start_date: z.string().refine(isIsoDate),
    end_date: z.string().refine(isIsoDate),
    percent: pct.pipe(z.number().min(-60).max(100).refine((n) => n !== 0, 'O ajuste não pode ser zero')),
  }).refine((s) => s.end_date >= s.start_date, 'A data final precisa ser depois da inicial'),
])

const unauthorized = () => NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

export async function GET() {
  if (!(await requireAdmin())) return unauthorized()
  try {
    const data = await adminGraphql<{ pricing_rules: unknown[] }>(
      `query R { pricing_rules(order_by: [{ kind: asc }, { min_days: asc }, { start_date: asc }]) { ${FIELDS} } }`,
    )
    return NextResponse.json({ rules: data.pricing_rules })
  } catch (error) {
    console.error('[admin/pricing-rules]', error)
    return NextResponse.json({ error: 'Erro ao carregar as regras' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = create.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  try {
    const data = await adminGraphql<{ insert_pricing_rules_one: { id: string } }>(
      `mutation C($o: pricing_rules_insert_input!) { insert_pricing_rules_one(object: $o) { id } }`,
      { o: parsed.data },
    )
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'pricing_rule', resourceId: data.insert_pricing_rules_one.id, metadata: parsed.data })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/pricing-rules POST]', error)
    return NextResponse.json({ error: 'Erro ao criar a regra' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql(
      `mutation U($id: uuid!, $active: Boolean!) { update_pricing_rules_by_pk(pk_columns: { id: $id }, _set: { active: $active }) { id } }`,
      parsed.data,
    )
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'pricing_rule', resourceId: parsed.data.id, metadata: { active: parsed.data.active } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/pricing-rules PATCH]', error)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const id = req.nextUrl.searchParams.get('id')
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql(`mutation D($id: uuid!) { delete_pricing_rules_by_pk(id: $id) { id } }`, { id })
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'pricing_rule', resourceId: id as string, metadata: { deleted: true } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/pricing-rules DELETE]', error)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}

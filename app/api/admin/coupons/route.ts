export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { normalizeCoupon } from '@/lib/pricing-rules'
import { isIsoDate } from '@/lib/rental'
import { createAuditLog } from '@/lib/security/audit'

const FIELDS = 'id code description percent amount min_days valid_from valid_until max_uses uses active created_at'
const optDate = z.string().refine(isIsoDate).nullable().optional()

const create = z
  .object({
    code: z.string().transform(normalizeCoupon).pipe(z.string().regex(/^[A-Z0-9]{3,20}$/, 'Código com 3 a 20 letras ou números')),
    description: z.string().trim().max(200).optional(),
    type: z.enum(['percent', 'amount']),
    value: z.number().finite().gt(0).transform((n) => Math.round(n * 100) / 100),
    min_days: z.number().int().min(1).max(90).default(1),
    valid_from: optDate,
    valid_until: optDate,
    max_uses: z.number().int().positive().max(100000).nullable().optional(),
  })
  .refine((c) => c.type !== 'percent' || c.value <= 60, 'O desconto máximo é de 60%')
  .refine((c) => !c.valid_from || !c.valid_until || c.valid_until >= c.valid_from, 'A validade final precisa ser depois da inicial')

const unauthorized = () => NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return unauthorized()
  try {
    const data = await adminGraphql<{ coupons: unknown[] }>(`query C { coupons(order_by: { created_at: desc }) { ${FIELDS} } }`)
    return viewerJson(viewer, { coupons: data.coupons })
  } catch (error) {
    console.error('[admin/coupons]', error)
    return viewerJson(viewer, { error: 'Erro ao carregar os cupons' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = create.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  const { type, value, ...rest } = parsed.data
  const object = { ...rest, description: rest.description || null, percent: type === 'percent' ? value : null, amount: type === 'amount' ? value : null }
  try {
    await adminGraphql(`mutation C($o: coupons_insert_input!) { insert_coupons_one(object: $o) { id } }`, { o: object })
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'coupon', resourceId: object.code, metadata: object })
    return NextResponse.json({ success: true })
  } catch (error) {
    const dup = String(error).includes('coupons_code_key') || String(error).includes('Uniqueness')
    if (!dup) console.error('[admin/coupons POST]', error)
    return NextResponse.json({ error: dup ? 'Já existe um cupom com esse código.' : 'Erro ao criar o cupom' }, { status: dup ? 409 : 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql(`mutation U($id: uuid!, $active: Boolean!) { update_coupons_by_pk(pk_columns: { id: $id }, _set: { active: $active }) { id } }`, parsed.data)
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'coupon', resourceId: parsed.data.id, metadata: { active: parsed.data.active } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/coupons PATCH]', error)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}

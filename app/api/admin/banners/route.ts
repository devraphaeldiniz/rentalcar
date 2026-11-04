export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin } from '@/lib/auth/authorization'
import { BANNER_FIELDS, PLACEMENTS, TONES } from '@/lib/banners'
import { normalizeCoupon } from '@/lib/pricing-rules'
import { isIsoDate } from '@/lib/rental'
import { safeRedirect } from '@/lib/safe-redirect'
import { createAuditLog } from '@/lib/security/audit'

const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null).nullable().optional()
const optDate = z.string().refine(isIsoDate).nullable().optional()

const create = z
  .object({
    placement: z.enum(Object.keys(PLACEMENTS) as [keyof typeof PLACEMENTS]),
    title: z.string().trim().min(3).max(80),
    body: optText(200),
    cta_label: optText(30),
    // Só links internos, validados pela mesma regra dos redirecionamentos.
    cta_href: optText(200).transform((v) => (v ? (safeRedirect(v, '') || null) : null)),
    coupon_code: optText(30).transform((v) => (v ? normalizeCoupon(v) || null : null)),
    tone: z.enum(TONES).default('brand'),
    starts_on: optDate,
    ends_on: optDate,
    sort: z.number().int().min(0).max(99).default(0),
  })
  .refine((b) => !b.cta_label || b.cta_href, 'O botão precisa de um link do próprio site, começando com / (ex.: /#carros). Links externos não são aceitos.')
  .refine((b) => !b.starts_on || !b.ends_on || b.ends_on >= b.starts_on, 'O fim precisa ser depois do início')

const unauthorized = () => NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

export async function GET() {
  if (!(await requireAdmin())) return unauthorized()
  try {
    const data = await adminGraphql<{ banners: unknown[] }>(`query B { banners(order_by: [{ placement: asc }, { sort: asc }]) { ${BANNER_FIELDS} } }`)
    return NextResponse.json({ banners: data.banners })
  } catch (error) {
    console.error('[admin/banners]', error)
    return NextResponse.json({ error: 'Erro ao carregar os banners' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = create.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  try {
    const data = await adminGraphql<{ insert_banners_one: { id: string } }>(`mutation C($o: banners_insert_input!) { insert_banners_one(object: $o) { id } }`, { o: parsed.data })
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'banner', resourceId: data.insert_banners_one.id, metadata: { title: parsed.data.title } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/banners POST]', error)
    return NextResponse.json({ error: 'Erro ao criar o banner' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql(`mutation U($id: uuid!, $active: Boolean!) { update_banners_by_pk(pk_columns: { id: $id }, _set: { active: $active }) { id } }`, parsed.data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/banners PATCH]', error)
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const id = req.nextUrl.searchParams.get('id')
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql(`mutation D($id: uuid!) { delete_banners_by_pk(id: $id) { id } }`, { id })
    await createAuditLog({ userId: admin.userId, action: 'pricing.updated', resource: 'banner', resourceId: id as string, metadata: { deleted: true } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/banners DELETE]', error)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}

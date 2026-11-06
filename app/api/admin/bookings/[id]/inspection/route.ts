export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { createAuditLog } from '@/lib/security/audit'
import { extraTotal, INSPECTION_FLOW, type Inspection, inspectionDbError, inspectionInput } from '@/lib/inspections'

const FIELDS = 'id booking_id kind odometer_km fuel_eighths damages extra_charges extra_total notes created_at'
const unauthorized = () => NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const viewer = await requireAdminView()
  if (!viewer) return unauthorized()
  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) return viewerJson(viewer, { error: 'Reserva não encontrada' }, { status: 404 })
  try {
    const data = await adminGraphql<{ booking_inspections: Inspection[] }>(
      `query I($id: uuid!) { booking_inspections(where: { booking_id: { _eq: $id } }, order_by: { created_at: asc }) { ${FIELDS} } }`,
      { id },
    )
    return viewerJson(viewer, { inspections: data.booking_inspections })
  } catch (error) {
    console.error('[admin/inspection GET]', error)
    return viewerJson(viewer, { error: 'Não foi possível carregar a vistoria. A migração 015 já foi aplicada?' }, { status: 500 })
  }
}

/**
 * Registra a vistoria e avança a reserva: retirada (confirmada → em andamento) e
 * devolução (em andamento → concluída).
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  const parsed = inspectionInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  const input = parsed.data
  const flow = INSPECTION_FLOW[input.kind]
  // Na retirada não há cobrança extra: ela só entra na devolução.
  const charges = input.kind === 'return' ? input.extra_charges : []

  try {
    const { bookings_by_pk: booking } = await adminGraphql<{ bookings_by_pk: { status: string } | null }>(
      'query B($id: uuid!) { bookings_by_pk(id: $id) { status } }',
      { id },
    )
    if (!booking) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    if (!flow.from.includes(booking.status)) {
      const need = input.kind === 'pickup' ? 'confirmada' : 'em andamento (com a retirada feita)'
      return NextResponse.json({ error: `A reserva precisa estar ${need} para essa vistoria.` }, { status: 409 })
    }

    const inserted = await adminGraphql<{ insert_booking_inspections_one: Inspection }>(
      `mutation I($o: booking_inspections_insert_input!) { insert_booking_inspections_one(object: $o) { ${FIELDS} } }`,
      { o: { ...input, extra_charges: charges, extra_total: extraTotal(charges), booking_id: id, created_by: admin.userId } },
    )
    // Avança o status só se ninguém mudou a reserva no meio do caminho.
    await adminGraphql(
      `mutation S($id: uuid!, $from: [String!]!, $to: String!) {
        update_bookings(where: { id: { _eq: $id }, status: { _in: $from } }, _set: { status: $to }) { affected_rows }
      }`,
      { id, from: flow.from, to: flow.to },
    )
    await createAuditLog({
      userId: admin.userId,
      action: 'booking.updated',
      resource: 'booking',
      resourceId: id,
      metadata: { inspection: input.kind, odometer_km: input.odometer_km, fuel_eighths: input.fuel_eighths, damages: input.damages.length, extra_total: extraTotal(charges) },
    })
    return NextResponse.json({ success: true, inspection: inserted.insert_booking_inspections_one, status: flow.to })
  } catch (error) {
    const friendly = inspectionDbError(String(error))
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 })
    console.error('[admin/inspection POST]', error)
    return NextResponse.json({ error: 'Não foi possível salvar a vistoria' }, { status: 500 })
  }
}

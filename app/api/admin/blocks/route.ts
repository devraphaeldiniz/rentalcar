export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { createAuditLog } from '@/lib/security/audit'
import { todayIso } from '@/lib/rental'
import { blockInput, type VehicleBlock } from '@/lib/vehicle-blocks'

const unauthorized = () => NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
const FIELDS = 'id vehicle_id start_date end_date reason notes created_at'

/** Bloqueios que ainda não terminaram, com o carro. */
export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return unauthorized()
  try {
    const data = await adminGraphql<{ vehicle_blocks: VehicleBlock[]; vehicles: { id: string; brand: string; model: string; plate: string | null }[] }>(
      `query Blocks($today: date!) {
        vehicle_blocks(where: { end_date: { _gt: $today } }, order_by: { start_date: asc }) { ${FIELDS} }
        vehicles(order_by: [{ brand: asc }, { model: asc }]) { id brand model plate }
      }`,
      { today: todayIso() },
    )
    return viewerJson(viewer, { blocks: data.vehicle_blocks, vehicles: data.vehicles })
  } catch (error) {
    console.error('[admin/blocks]', error)
    return viewerJson(viewer, { error: 'Não foi possível carregar os bloqueios. A migração 014 já foi aplicada?' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const parsed = blockInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  const block = parsed.data
  if (block.end_date <= todayIso()) return NextResponse.json({ error: 'Esse período já passou.' }, { status: 400 })

  try {
    // Mostra quais reservas atrapalham, em vez de só "conflito".
    const conflicts = await adminGraphql<{ bookings: { id: string; start_date: string; end_date: string }[] }>(
      `query Conflicts($vid: uuid!, $start: date!, $end: date!) {
        bookings(where: { vehicle_id: { _eq: $vid }, status: { _in: ["pending", "confirmed", "active"] }, start_date: { _lt: $end }, end_date: { _gt: $start } }) { id start_date end_date }
      }`,
      { vid: block.vehicle_id, start: block.start_date, end: block.end_date },
    )
    if (conflicts.bookings.length > 0) {
      return NextResponse.json(
        { error: 'Esse carro tem reserva nesse período. Cancele ou troque o carro da reserva antes de bloquear.', bookings: conflicts.bookings },
        { status: 409 },
      )
    }
    const created = await adminGraphql<{ insert_vehicle_blocks_one: { id: string } }>(
      'mutation B($o: vehicle_blocks_insert_input!) { insert_vehicle_blocks_one(object: $o) { id } }',
      { o: { ...block, created_by: admin.userId } },
    )
    await createAuditLog({ userId: admin.userId, action: 'vehicle.updated', resource: 'vehicle', resourceId: block.vehicle_id, metadata: { blocked: block } })
    return NextResponse.json({ success: true, id: created.insert_vehicle_blocks_one.id })
  } catch (error) {
    const message = String(error)
    if (message.includes('vehicle_blocks_no_overlap')) return NextResponse.json({ error: 'Já existe um bloqueio desse carro em parte desse período.' }, { status: 409 })
    if (message.includes('vehicle_block_conflict')) return NextResponse.json({ error: 'Uma reserva acabou de entrar nesse período. Atualize a página.' }, { status: 409 })
    console.error('[admin/blocks POST]', error)
    return NextResponse.json({ error: 'Não foi possível bloquear o carro' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return unauthorized()
  const id = req.nextUrl.searchParams.get('id')
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Bloqueio não encontrado' }, { status: 404 })
  try {
    const data = await adminGraphql<{ delete_vehicle_blocks_by_pk: { vehicle_id: string } | null }>(
      'mutation D($id: uuid!) { delete_vehicle_blocks_by_pk(id: $id) { vehicle_id } }',
      { id },
    )
    if (!data.delete_vehicle_blocks_by_pk) return NextResponse.json({ error: 'Bloqueio não encontrado' }, { status: 404 })
    await createAuditLog({ userId: admin.userId, action: 'vehicle.updated', resource: 'vehicle', resourceId: data.delete_vehicle_blocks_by_pk.vehicle_id, metadata: { unblocked: id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/blocks DELETE]', error)
    return NextResponse.json({ error: 'Não foi possível liberar o carro' }, { status: 500 })
  }
}

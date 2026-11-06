export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { EDITABLE_VEHICLE_FIELDS as EDITABLE } from '@/lib/vehicle-fields'
import { createAuditLog } from '@/lib/security/audit'
import { updateVehicleResponse } from '@/lib/vehicles-server'

const notFound = () => NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
const validId = (id: string) => z.string().uuid().safeParse(id).success

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  if (!validId(id)) return notFound()
  try {
    const data = await adminGraphql<{ vehicles_by_pk: unknown }>(
      `query AdminVehicle($id: uuid!) { vehicles_by_pk(id: $id) { id ${EDITABLE.join(' ')} image_credits } }`,
      { id },
    )
    if (!data.vehicles_by_pk) return viewerJson(viewer, { error: 'Veículo não encontrado' }, { status: 404 })
    return viewerJson(viewer, { vehicle: data.vehicles_by_pk })
  } catch (error) {
    console.error('[admin/vehicles/:id GET]', error)
    return viewerJson(viewer, { error: 'Erro ao carregar o veículo' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await ctx.params
  if (!validId(id)) return notFound()
  return updateVehicleResponse(id, await req.json().catch(() => null), admin.userId)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const { id } = await ctx.params
  if (!validId(id)) return notFound()
  try {
    const data = await adminGraphql<{ delete_vehicles_by_pk: { id: string } | null }>(
      'mutation DeleteVehicle($id: uuid!) { delete_vehicles_by_pk(id: $id) { id } }',
      { id },
    )
    if (!data.delete_vehicles_by_pk) return notFound()
    await createAuditLog({ userId: admin.userId, action: 'vehicle.deleted', resource: 'vehicle', resourceId: id })
    return NextResponse.json({ success: true })
  } catch (error) {
    // bookings.vehicle_id é ON DELETE RESTRICT: carro com reservas não sai do banco.
    const message = String((error as Error)?.message ?? error)
    if (message.includes('foreign key') || message.includes('constraint')) {
      return NextResponse.json({ error: 'Este carro tem reservas no histórico e não pode ser excluído. Marque-o como indisponível.' }, { status: 409 })
    }
    console.error('[admin/vehicles/:id DELETE]', error)
    return NextResponse.json({ error: 'Não foi possível excluir o veículo.' }, { status: 500 })
  }
}

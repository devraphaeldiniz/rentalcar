import { NextResponse } from 'next/server'
import { adminGraphql } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { pickVehicleFields } from '@/lib/vehicle-fields'

/** Mensagem clara para os erros mais comuns do banco ao gravar um veículo. */
export function vehicleDbError(error: unknown): string | null {
  const message = String((error as Error)?.message ?? error)
  if (message.includes('vehicles_plate_key') || (message.includes('Uniqueness') && message.includes('plate'))) return 'Já existe um carro com essa placa.'
  if (message.includes('category')) return 'Categoria inválida.'
  if (message.includes('violates check constraint') || message.includes('constraint-violation')) return 'Algum valor está fora do permitido. Revise os campos.'
  return null
}

function invalidRate(data: Record<string, unknown>) {
  return data.daily_rate !== undefined && !(Number(data.daily_rate) > 0)
}

/** Cria um veículo só com os campos editáveis (o painel nunca grava id, nota média ou créditos das fotos). */
export async function createVehicleResponse(body: unknown, adminId: string) {
  const data = pickVehicleFields(body)
  if (!data.brand || !data.model || !data.plate) return NextResponse.json({ error: 'Informe marca, modelo e placa.' }, { status: 400 })
  if (invalidRate(data) || data.daily_rate === undefined) return NextResponse.json({ error: 'A diária precisa ser maior que zero.' }, { status: 400 })
  try {
    const created = await adminGraphql<{ insert_vehicles_one: { id: string; brand: string; model: string } }>(
      'mutation CreateVehicle($object: vehicles_insert_input!) { insert_vehicles_one(object: $object) { id brand model } }',
      { object: data },
    )
    await createAuditLog({ userId: adminId, action: 'vehicle.created', resource: 'vehicle', resourceId: created.insert_vehicles_one.id, metadata: { brand: data.brand, model: data.model, plate: data.plate } })
    return NextResponse.json({ success: true, vehicle: created.insert_vehicles_one })
  } catch (error) {
    const friendly = vehicleDbError(error)
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 })
    console.error('[admin/vehicles create]', error)
    return NextResponse.json({ error: 'Erro ao criar veículo' }, { status: 500 })
  }
}

export async function updateVehicleResponse(id: string, body: unknown, adminId: string) {
  const data = pickVehicleFields(body)
  if (invalidRate(data)) return NextResponse.json({ error: 'A diária precisa ser maior que zero.' }, { status: 400 })
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nada para alterar' }, { status: 400 })
  try {
    const updated = await adminGraphql<{ update_vehicles_by_pk: { id: string } | null }>(
      'mutation UpdateVehicle($id: uuid!, $set: vehicles_set_input!) { update_vehicles_by_pk(pk_columns: { id: $id }, _set: $set) { id } }',
      { id, set: data },
    )
    if (!updated.update_vehicles_by_pk) return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    await createAuditLog({ userId: adminId, action: 'vehicle.updated', resource: 'vehicle', resourceId: id, metadata: { fields: Object.keys(data) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const friendly = vehicleDbError(error)
    if (friendly) return NextResponse.json({ error: friendly }, { status: 409 })
    console.error('[admin/vehicles update]', error)
    return NextResponse.json({ error: 'Erro ao atualizar veículo' }, { status: 500 })
  }
}

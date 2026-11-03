export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql } from '@/lib/auth/authorization'

// Detalhe público de um veículo (a página /vehicles/[id] chamava esta rota,
// que não existia). Devolve só campos de catálogo; veículos em manutenção ficam ocultos.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
  }

  try {
    const data = await adminGraphql<{ vehicles_by_pk: { status: string } | null }>(
      `query PublicVehicle($id: uuid!) {
        vehicles_by_pk(id: $id) {
          id brand model year plate color category daily_rate status
          description transmission fuel_type passengers doors trunk_capacity
          features images image_url average_rating total_reviews
        }
      }`,
      { id: params.id },
    )
    const vehicle = data.vehicles_by_pk
    if (!vehicle || vehicle.status === 'maintenance') {
      return NextResponse.json({ error: 'Veículo não encontrado' }, { status: 404 })
    }
    return NextResponse.json(vehicle)
  } catch (error) {
    console.error('[vehicles/:id]', error)
    return NextResponse.json({ error: 'Erro ao carregar veículo' }, { status: 500 })
  }
}

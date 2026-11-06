export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'
import { createVehicleResponse } from '@/lib/vehicles-server'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ vehicles: unknown[] }>(`
      query GetVehicles {
        vehicles(order_by: { created_at: desc }) { id brand model year plate daily_rate category status images features created_at }
      }`)
    return viewerJson(viewer, { vehicles: data.vehicles })
  } catch (error) {
    console.error('[admin/vehicles]', error)
    return viewerJson(viewer, { error: 'Erro ao buscar veículos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  return createVehicleResponse(await req.json().catch(() => null), admin.userId)
}

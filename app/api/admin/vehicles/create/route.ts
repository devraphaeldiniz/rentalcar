export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/authorization'
import { createVehicleResponse } from '@/lib/vehicles-server'

// Usada pela tela "Novo veículo". A lista usa POST /api/admin/vehicles; as duas gravam igual.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  return createVehicleResponse(await req.json().catch(() => null), admin.userId)
}

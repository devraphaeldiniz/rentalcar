export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/authorization'

export async function POST() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // TODO: Revogar todas as outras sessões exceto a atual
  
  return NextResponse.json({ success: true })
}

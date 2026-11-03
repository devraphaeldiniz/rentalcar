export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/authorization'

export async function GET() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // TODO: Verificar status real do 2FA do usuário
  return NextResponse.json({ enabled: false })
}

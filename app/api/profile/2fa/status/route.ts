export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET() {
  // TODO: Verificar status real do 2FA do usuário
  return NextResponse.json({ enabled: false })
}

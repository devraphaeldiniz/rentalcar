import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  // TODO: Verificar código e desativar 2FA no banco

  return NextResponse.json({ success: true })
}

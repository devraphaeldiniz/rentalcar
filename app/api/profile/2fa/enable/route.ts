import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  // TODO: Verificar código e ativar 2FA no banco
  
  // Gerar códigos de backup
  const backupCodes = Array.from({ length: 8 }, () => 
    Math.random().toString(36).substring(2, 10).toUpperCase()
  )

  return NextResponse.json({
    success: true,
    backupCodes,
  })
}

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  // TODO: Buscar sessões reais do banco
  // Por enquanto, dados mockados para demonstração
  const sessions = [
    {
      id: '1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      ip_address: '192.168.1.100',
      last_active: new Date().toISOString(),
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      device_name: 'Chrome no Windows',
    },
    {
      id: '2',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
      ip_address: '192.168.1.101',
      last_active: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      device_name: 'Safari no iPhone',
    },
  ]

  return NextResponse.json({ sessions })
}

export async function DELETE(req: NextRequest) {
  const { sessionId } = await req.json()
  
  // TODO: Deletar sessão do banco
  
  return NextResponse.json({ success: true })
}

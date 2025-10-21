import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  // TODO: Buscar logs reais do banco usando getAuditLogs()
  // Por enquanto, dados mockados para demonstração
  const mockLogs = [
    {
      id: '1',
      action: 'user.login',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      action: 'user.2fa_enabled',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: '3',
      action: 'booking.created',
      resource: 'Toyota Corolla',
      resource_id: 'booking-123',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      metadata: {
        vehicle: 'Toyota Corolla 2024',
        start_date: '2025-10-25',
        end_date: '2025-10-30',
        total: 'R$ 1400.00'
      },
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '4',
      action: 'user.login',
      ip_address: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '5',
      action: 'admin.access',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
  ]

  const logs = mockLogs.slice((page - 1) * limit, page * limit)
  const hasMore = page * limit < mockLogs.length

  return NextResponse.json({ logs, hasMore })
}

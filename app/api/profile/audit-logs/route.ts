export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'

// Histórico real do próprio usuário (antes eram dados de exemplo).
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 20))

  try {
    const data = await adminGraphql<{ audit_logs: unknown[] }>(
      `query MyLogs($userId: uuid!, $limit: Int!, $offset: Int!) {
        audit_logs(where: { user_id: { _eq: $userId } }, order_by: { created_at: desc }, limit: $limit, offset: $offset) {
          id action resource resource_id ip_address user_agent metadata created_at
        }
      }`,
      { userId: auth.userId, limit: limit + 1, offset: (page - 1) * limit },
    )
    const rows = data.audit_logs ?? []
    return NextResponse.json({ logs: rows.slice(0, limit), hasMore: rows.length > limit })
  } catch (error) {
    console.error('[profile/audit-logs]', error)
    return NextResponse.json({ error: 'Erro ao carregar o histórico' }, { status: 500 })
  }
}

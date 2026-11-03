export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'

type Count = { aggregate: { count: number } }

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  // Indicadores das últimas 24 horas, a partir das tabelas reais.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const data = await adminGraphql<{
      total: Count
      failed: Count
      suspicious: { email: string }[]
      activeUsers: { user_id: string }[]
      login_attempts: { id: string; email: string; ip_address: string | null; success: boolean; created_at: string }[]
      audit_logs: {
        id: string
        action: string
        resource: string | null
        resource_id: string | null
        metadata: unknown
        created_at: string
        user: { email: string | null } | null
      }[]
    }>(
      `query SecurityData($since: timestamptz!) {
        total: login_attempts_aggregate(where: { created_at: { _gte: $since } }) { aggregate { count } }
        failed: login_attempts_aggregate(where: { created_at: { _gte: $since }, success: { _eq: false } }) { aggregate { count } }
        suspicious: login_attempts(
          where: { created_at: { _gte: $since }, success: { _eq: false } }
          distinct_on: email
        ) { email }
        activeUsers: audit_logs(
          where: { created_at: { _gte: $since }, action: { _eq: "user.login" }, user_id: { _is_null: false } }
          distinct_on: user_id
        ) { user_id }
        login_attempts(order_by: { created_at: desc }, limit: 50) { id email ip_address success created_at }
        audit_logs(order_by: { created_at: desc }, limit: 100) {
          id action resource resource_id metadata created_at
          user { email }
        }
      }`,
      { since },
    )

    return NextResponse.json({
      totalLogins: data.total.aggregate.count,
      failedLogins: data.failed.aggregate.count,
      activeUsers: data.activeUsers.length,
      // E-mails com falhas de login nas últimas 24h
      suspiciousActivity: data.suspicious.length,
      loginAttempts: data.login_attempts,
      auditLogs: data.audit_logs.map((log) => ({
        id: log.id,
        user_email: log.user?.email ?? '—',
        action: log.action,
        details: [log.resource, log.resource_id].filter(Boolean).join(' ') || (log.metadata ? JSON.stringify(log.metadata) : ''),
        created_at: log.created_at,
      })),
    })
  } catch (error) {
    console.error('[admin/security]', error)
    return NextResponse.json({ error: 'Erro ao carregar dados de segurança' }, { status: 500 })
  }
}

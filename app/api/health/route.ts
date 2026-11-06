export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { adminGraphql } from '@/lib/auth/authorization'

/**
 * Saúde da aplicação para monitores externos (UptimeRobot, Better Stack...) e para o painel.
 * Responde 200 quando o banco responde e 503 quando não. Não expõe dados nem configuração.
 */
export async function GET() {
  const started = Date.now()
  let database: { ok: boolean; ms: number }
  try {
    await adminGraphql('query Health { vehicles_aggregate(limit: 1) { aggregate { count } } }')
    database = { ok: true, ms: Date.now() - started }
  } catch {
    database = { ok: false, ms: Date.now() - started }
  }
  const body = {
    status: database.ok ? 'ok' : 'degraded',
    checks: { database },
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    time: new Date().toISOString(),
  }
  return NextResponse.json(body, { status: database.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
}

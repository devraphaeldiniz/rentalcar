import { adminGraphql } from '@/lib/auth/authorization'

// Módulo só de servidor: é chamado dentro de /api/auth/signin.
// Não é uma server action nem tem rota pública, para ninguém
// conseguir registrar falhas em nome de outro e bloquear a conta.

export const EMAIL_MAX_FAILURES = 5
export const IP_MAX_FAILURES = 20
export const WINDOW_MINUTES = 15

export type RateLimitResult = {
  allowed: boolean
  retryAfterMinutes: number
}

export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  try {
    const data = await adminGraphql<{
      byEmail: { aggregate: { count: number } }
      byIp: { aggregate: { count: number } }
    }>(
      `query LoginFailures($email: String!, $ip: String!, $since: timestamptz!) {
        byEmail: login_attempts_aggregate(where: { email: { _eq: $email }, success: { _eq: false }, created_at: { _gte: $since } }) {
          aggregate { count }
        }
        byIp: login_attempts_aggregate(where: { ip_address: { _eq: $ip }, success: { _eq: false }, created_at: { _gte: $since } }) {
          aggregate { count }
        }
      }`,
      { email, ip, since },
    )
    const emailFailures = data.byEmail?.aggregate?.count ?? 0
    const ipFailures = data.byIp?.aggregate?.count ?? 0
    const allowed = emailFailures < EMAIL_MAX_FAILURES && ipFailures < IP_MAX_FAILURES
    return { allowed, retryAfterMinutes: allowed ? 0 : WINDOW_MINUTES }
  } catch (error) {
    // Falha aberta de propósito: se a tabela de tentativas estiver fora do ar,
    // o login continua funcionando (a senha ainda é validada pelo Nhost).
    console.error('[rate-limit] verificação falhou:', error)
    return { allowed: true, retryAfterMinutes: 0 }
  }
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean, failureReason?: string) {
  try {
    await adminGraphql(
      `mutation RecordLoginAttempt($object: login_attempts_insert_input!) {
        insert_login_attempts_one(object: $object) { id }
      }`,
      { object: { email, ip_address: ip, success, failure_reason: failureReason ?? null } },
    )
  } catch (error) {
    console.error('[rate-limit] registro falhou:', error)
  }
}

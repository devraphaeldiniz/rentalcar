import { adminGraphql } from '@/lib/auth/authorization'

// Módulo só de servidor: é chamado dentro de /api/auth/signin.
// Não é uma server action nem tem rota pública, para ninguém
// conseguir registrar falhas em nome de outro e bloquear a conta.

// Três limites combinados:
// - e-mail + IP: barra quem tenta adivinhar a senha de uma conta (5);
// - e-mail de qualquer origem: barra ataque distribuído contra uma conta (30),
//   alto o bastante para um estranho não conseguir travar a conta de alguém
//   com poucas tentativas;
// - IP: barra quem testa muitas contas a partir do mesmo lugar (20).
export const EMAIL_IP_MAX_FAILURES = 5
export const EMAIL_MAX_FAILURES = 30
export const IP_MAX_FAILURES = 20
export const WINDOW_MINUTES = 15

export type RateLimitResult = {
  allowed: boolean
  retryAfterMinutes: number
}

// Backstop em memória (por instância), usado SÓ quando a verificação no banco falha.
// Mantém o login disponível se a tabela der soluço, mas sem ficar totalmente sem freio
// (antes, uma falha no banco liberava a força bruta).
const BACKSTOP_MAX = 10
const backstop = new Map<string, { n: number; reset: number }>()
function backstopAllows(key: string): boolean {
  const now = Date.now()
  const h = backstop.get(key)
  if (!h || h.reset < now) {
    if (backstop.size > 10000) backstop.clear()
    backstop.set(key, { n: 1, reset: now + WINDOW_MINUTES * 60 * 1000 })
    return true
  }
  h.n += 1
  return h.n <= BACKSTOP_MAX
}

// Limite de cadastros por IP na última hora, contado no banco (vale entre instâncias).
export const SIGNUPS_PER_IP_MAX = 8
export const SIGNUP_WINDOW_MINUTES = 60

export async function checkLoginRateLimit(email: string, ip: string): Promise<RateLimitResult> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  try {
    const data = await adminGraphql<{
      byEmail: { aggregate: { count: number } }
      byIp: { aggregate: { count: number } }
      byEmailIp: { aggregate: { count: number } }
    }>(
      `query LoginFailures($email: String!, $ip: inet!, $since: timestamptz!) {
        byEmailIp: login_attempts_aggregate(where: { email: { _eq: $email }, ip_address: { _eq: $ip }, success: { _eq: false }, created_at: { _gte: $since } }) {
          aggregate { count }
        }
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
    const emailIpFailures = data.byEmailIp?.aggregate?.count ?? 0
    const allowed = emailIpFailures < EMAIL_IP_MAX_FAILURES && emailFailures < EMAIL_MAX_FAILURES && ipFailures < IP_MAX_FAILURES
    return { allowed, retryAfterMinutes: allowed ? 0 : WINDOW_MINUTES }
  } catch (error) {
    // Banco fora do ar: cai no backstop em memória para não liberar força bruta.
    console.error('[rate-limit] verificação falhou, usando backstop em memória:', error)
    const allowed = backstopAllows(`${email}|${ip}`)
    return { allowed, retryAfterMinutes: allowed ? 0 : WINDOW_MINUTES }
  }
}

/**
 * Quantos cadastros partiram deste IP na última hora (trilha de auditoria `user.register`).
 * Em caso de erro devolve 0 — o freio em memória do cadastro ainda cobre rajadas.
 */
export async function recentSignupsByIp(ip: string): Promise<number> {
  const since = new Date(Date.now() - SIGNUP_WINDOW_MINUTES * 60 * 1000).toISOString()
  try {
    const data = await adminGraphql<{ audit_logs_aggregate: { aggregate: { count: number } } }>(
      `query SignupsByIp($ip: inet!, $since: timestamptz!) {
        audit_logs_aggregate(where: { action: { _eq: "user.register" }, ip_address: { _eq: $ip }, created_at: { _gte: $since } }) {
          aggregate { count }
        }
      }`,
      { ip, since },
    )
    return data.audit_logs_aggregate?.aggregate?.count ?? 0
  } catch (error) {
    console.error('[rate-limit] contagem de cadastros falhou:', error)
    return 0
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

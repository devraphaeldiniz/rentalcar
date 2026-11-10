import { afterEach, describe, expect, it, vi } from 'vitest'

// Controla o acesso ao banco para testar os dois caminhos sem rede.
vi.mock('@/lib/auth/authorization', () => ({ adminGraphql: vi.fn() }))

import { adminGraphql } from '@/lib/auth/authorization'
import { checkLoginRateLimit, recentSignupsByIp, SIGNUPS_PER_IP_MAX } from '@/lib/security/rate-limit'

const mockDb = vi.mocked(adminGraphql)

afterEach(() => mockDb.mockReset())

describe('backstop do login quando o banco falha', () => {
  it('não fica sem freio: bloqueia depois de 10 tentativas no mesmo email+IP', async () => {
    mockDb.mockRejectedValue(new Error('banco fora do ar'))
    const email = `falha-${Date.now()}@teste.com`
    const ip = '203.0.113.7'

    const results: boolean[] = []
    for (let i = 0; i < 11; i++) {
      const r = await checkLoginRateLimit(email, ip)
      results.push(r.allowed)
    }

    // As 10 primeiras passam (login continua disponível); a 11ª é barrada.
    expect(results.slice(0, 10).every(Boolean)).toBe(true)
    expect(results[10]).toBe(false)
  })

  it('quando o banco responde, usa a contagem do banco e não o backstop', async () => {
    mockDb.mockResolvedValue({
      byEmail: { aggregate: { count: 0 } },
      byIp: { aggregate: { count: 0 } },
      byEmailIp: { aggregate: { count: 0 } },
    })
    const r = await checkLoginRateLimit('ok@teste.com', '203.0.113.8')
    expect(r.allowed).toBe(true)
  })
})

describe('limite de cadastro por IP (no banco, entre instâncias)', () => {
  it('devolve a contagem da trilha de auditoria', async () => {
    mockDb.mockResolvedValue({ audit_logs_aggregate: { aggregate: { count: SIGNUPS_PER_IP_MAX } } })
    expect(await recentSignupsByIp('203.0.113.9')).toBe(SIGNUPS_PER_IP_MAX)
  })

  it('não trava o cadastro se a contagem falhar (devolve 0)', async () => {
    mockDb.mockRejectedValue(new Error('timeout'))
    expect(await recentSignupsByIp('203.0.113.9')).toBe(0)
  })
})

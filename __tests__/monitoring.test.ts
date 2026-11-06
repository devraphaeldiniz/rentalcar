import { describe, expect, it } from 'vitest'
import { fingerprint, normalizePath, scrub, toRow } from '@/lib/monitoring/sanitize'
import { groupErrors } from '@/lib/monitoring/summary'

describe('monitoramento de erros', () => {
  it('tira e-mail, CPF, tokens e segredos da mensagem', () => {
    expect(scrub('falhou para ana@x.com (CPF 123.456.789-09) com Bearer abc.def')).toBe('falhou para [email] (CPF [cpf]) com Bearer [token]')
    expect(scrub('config {"secret": "s3nh4"}')).toBe('config {"secret": "[oculto]"}')
  })

  it('caminho sem query string e com ids genéricos', () => {
    expect(normalizePath('/bookings/123e4567-e89b-12d3-a456-426614174000/pagamento?cupom=X&email=a@b.c')).toBe('/bookings/:id/pagamento')
  })

  it('o mesmo erro com números diferentes cai no mesmo grupo', () => {
    const a = fingerprint({ source: 'server', message: 'Timeout depois de 3012 ms', route: '/api/quote' })
    const b = fingerprint({ source: 'server', message: 'Timeout depois de 2990 ms', route: '/api/quote' })
    const c = fingerprint({ source: 'client', message: 'Timeout depois de 2990 ms', route: '/api/quote' })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('corta campos grandes e mantém só o começo da pilha', () => {
    const row = toRow({ source: 'client', message: 'x'.repeat(900), stack: Array.from({ length: 40 }, (_, i) => `at f${i}`).join('\n') })
    expect(row.message).toHaveLength(500)
    expect(row.stack?.split('\n')).toHaveLength(12)
  })

  it('agrupa ocorrências e conta', () => {
    const base = { source: 'server' as const, message: 'Falhou', route: '/api/x', method: 'GET', stack: null }
    const groups = groupErrors([
      { ...base, id: '3', fingerprint: 'a', path: '/a', created_at: '2026-11-06T03:00:00Z' },
      { ...base, id: '2', fingerprint: 'b', path: '/b', created_at: '2026-11-06T02:00:00Z' },
      { ...base, id: '1', fingerprint: 'a', path: '/c', created_at: '2026-11-05T01:00:00Z' },
    ])
    expect(groups.map((g) => [g.fingerprint, g.count])).toEqual([['a', 2], ['b', 1]])
    expect(groups[0].firstSeen).toBe('2026-11-05T01:00:00Z')
    expect(groups[0].paths).toEqual(['/a', '/c'])
  })
})

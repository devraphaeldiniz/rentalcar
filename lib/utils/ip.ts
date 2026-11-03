import { headers } from 'next/headers'

/**
 * IP do cliente, usado nos limites de tentativa.
 *
 * Cabeçalhos como x-forwarded-for podem ser enviados pelo próprio navegador.
 * Só são confiáveis quando há um proxy que os sobrescreve: na Vercel
 * (x-real-ip definido pela plataforma) ou quando TRUST_PROXY_HEADERS=true
 * num servidor próprio atrás de um proxy configurado. Fora disso, todas as
 * requisições contam como o mesmo IP, o que mantém os limites valendo.
 */
export async function getClientIP(): Promise<string> {
  const h = await headers()
  const trusted = process.env.VERCEL === '1' || process.env.TRUST_PROXY_HEADERS === 'true'
  if (!trusted) return '0.0.0.0'

  const real = h.get('x-real-ip')?.trim()
  if (real) return real
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || '0.0.0.0'
}

export async function getUserAgent(): Promise<string> {
  const h = await headers()
  return (h.get('user-agent') || 'Unknown').slice(0, 300)
}

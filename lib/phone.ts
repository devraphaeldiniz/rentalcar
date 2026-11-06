/** Telefone brasileiro salvo só com números (DDD + número). */
export function formatPhone(digits: string | null | undefined): string {
  const d = (digits ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d
}

/** Link do WhatsApp (wa.me) com o código do Brasil; null quando o número não é válido. */
export function whatsappUrl(digits: string | null | undefined, text?: string): string | null {
  let d = (digits ?? '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) d = `55${d}`
  if (!/^55\d{10,11}$/.test(d)) return null
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

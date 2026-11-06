// Atendimento pelo WhatsApp (link wa.me, sem API paga). Só aparece com NEXT_PUBLIC_WHATSAPP_NUMBER
// configurado: número com DDD, com ou sem o 55 (ex.: 31999998888).

function normalize(raw: string | undefined): string | null {
  let d = (raw ?? '').replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) d = `55${d}`
  return /^55\d{10,11}$/.test(d) ? d : null
}

export const STORE_WHATSAPP = normalize(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)

/** Link para conversar com a loja, já com a mensagem escrita. */
export function storeWhatsappLink(text: string, number: string | null = STORE_WHATSAPP): string | null {
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}

/** Mensagem inicial conforme a página em que a pessoa está. */
export function messageForPage(pathname: string, origin: string): string {
  if (/^\/vehicles\/[0-9a-f-]{36}\/?$/i.test(pathname)) return `Olá! Tenho uma dúvida sobre este carro: ${origin}${pathname}`
  if (pathname.startsWith('/profile/bookings')) return 'Olá! Tenho uma dúvida sobre uma das minhas reservas na AstaCar.'
  return 'Olá! Vim pelo site da AstaCar e tenho uma dúvida.'
}

export const bookingMessage = (code: string, vehicle?: string) =>
  `Olá! Sou cliente da AstaCar e queria falar sobre a reserva ${code}${vehicle ? ` (${vehicle})` : ''}.`

/** Telas em que o botão flutuante atrapalharia (painel, pagamento e checkout). */
export const hideFloatingButton = (pathname: string) =>
  pathname.startsWith('/admin') || /\/checkout\/?$/.test(pathname) || /\/pagamento\/?$/.test(pathname) || pathname.startsWith('/auth')

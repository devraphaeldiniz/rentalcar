// Modelos dos e-mails da reserva. HTML simples, com tabelas e estilos inline,
// que é o que os clientes de e-mail (Gmail, Outlook, celular) exibem bem.
import { REQUIREMENTS } from '@/lib/policies'
import { formatBRL, formatLongDate, pluralDays, rentalDays } from '@/lib/rental'
import { SITE_NAME, SITE_URL } from '@/lib/site'

export type EmailBooking = {
  id: string
  start_date: string
  end_date: string
  total_amount: number | string
  customer_name: string | null
  customer_email: string | null
  payment_method: string | null
  payment_status: string | null
  vehicle: { brand: string; model: string } | null
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const bookingCode = (id: string) => `ASTA-${id.slice(0, 8).toUpperCase()}`

function firstName(name: string | null) {
  const first = (name ?? '').trim().split(/\s+/)[0]
  return first ? first : 'Olá'
}

function paymentText(b: EmailBooking) {
  if (b.payment_status === 'paid') return 'Pago online pelo Mercado Pago'
  if (b.payment_method === 'online') return 'Aguardando pagamento online'
  return 'Pagamento na retirada'
}

function details(b: EmailBooking) {
  const car = b.vehicle ? `${b.vehicle.brand} ${b.vehicle.model}` : 'Seu carro'
  const days = rentalDays(b.start_date, b.end_date)
  return {
    car,
    rows: [
      ['Carro', car],
      ['Código', bookingCode(b.id)],
      ['Retirada', formatLongDate(b.start_date)],
      ['Devolução', formatLongDate(b.end_date)],
      ['Período', pluralDays(days)],
      ['Total', formatBRL(Number(b.total_amount))],
      ['Pagamento', paymentText(b)],
    ] as [string, string][],
    link: `${SITE_URL}/bookings/${b.id}/confirmation`,
  }
}

function layout(opts: { preheader: string; title: string; intro: string; rows: [string, string][]; extra: string; cta: { label: string; href: string } }) {
  const rows = opts.rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px">${escapeHtml(k)}</td><td style="padding:8px 0;font-size:14px;font-weight:600;text-align:right">${escapeHtml(v)}</td></tr>`,
    )
    .join('')
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(opts.title)}</title></head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<span style="display:none;max-height:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#0b0f1a;padding:20px 24px;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.5px">ASTA<span style="color:#22d3ee">CAR</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 8px;font-size:22px">${escapeHtml(opts.title)}</h1>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151">${opts.intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">${rows}</table>
${opts.extra}
<p style="margin:24px 0 0"><a href="${escapeHtml(opts.cta.href)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(opts.cta.label)}</a></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;line-height:1.5">Você recebeu este e-mail porque fez uma reserva na ${escapeHtml(SITE_NAME)}. Dúvidas? Responda este e-mail ou fale com a gente em ${escapeHtml(SITE_URL)}/contato.</td></tr>
</table></td></tr></table></body></html>`
}

function textVersion(title: string, intro: string, rows: [string, string][], extraText: string, link: string) {
  return [title, '', intro, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', extraText, '', `Ver reserva: ${link}`, '', SITE_NAME]
    .filter((l) => l !== undefined)
    .join('\n')
}

const requirementsHtml = () =>
  `<h2 style="margin:20px 0 8px;font-size:16px">Leve na retirada</h2><ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#374151">${REQUIREMENTS.map((r) => `<li><strong>${escapeHtml(r.title)}</strong>: ${escapeHtml(r.text)}</li>`).join('')}</ul>`
const requirementsText = () => `Leve na retirada:\n${REQUIREMENTS.map((r) => `- ${r.title}: ${r.text}`).join('\n')}`

export function confirmationEmail(b: EmailBooking) {
  const d = details(b)
  const paid = b.payment_status === 'paid'
  const title = paid ? 'Pagamento aprovado, reserva confirmada!' : 'Recebemos sua reserva!'
  const introText = paid
    ? `${firstName(b.customer_name)}, seu pagamento foi aprovado e o ${d.car} está garantido para você.`
    : `${firstName(b.customer_name)}, sua reserva do ${d.car} foi registrada. O pagamento é feito na retirada.`
  return {
    subject: `${paid ? 'Reserva confirmada' : 'Reserva registrada'} · ${d.car} · ${bookingCode(b.id)}`,
    html: layout({ preheader: introText, title, intro: escapeHtml(introText), rows: d.rows, extra: requirementsHtml(), cta: { label: 'Ver minha reserva', href: d.link } }),
    text: textVersion(title, introText, d.rows, requirementsText(), d.link),
  }
}

export function reminderEmail(b: EmailBooking) {
  const d = details(b)
  const title = 'Amanhã é dia de pegar o carro!'
  const introText = `${firstName(b.customer_name)}, a retirada do ${d.car} é amanhã, ${formatLongDate(b.start_date).toLowerCase()}. Confira o que levar.`
  return {
    subject: `Lembrete: retirada amanhã · ${d.car} · ${bookingCode(b.id)}`,
    html: layout({ preheader: introText, title, intro: escapeHtml(introText), rows: d.rows, extra: requirementsHtml(), cta: { label: 'Ver minha reserva', href: d.link } }),
    text: textVersion(title, introText, d.rows, requirementsText(), d.link),
  }
}

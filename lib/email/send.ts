// Envio de e-mail pela API do Resend (https://resend.com). Só de servidor.
// Sem RESEND_API_KEY o envio é ignorado (ambiente local sem e-mail não quebra a reserva).

export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
  /** Mesma chave = mesmo e-mail; o Resend descarta reenvios por 24h. */
  idempotencyKey?: string
}

export type SendResult = { sent: true; id: string } | { sent: false; reason: string }

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) return { sent: false, reason: 'e-mail não configurado (RESEND_API_KEY/EMAIL_FROM)' }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(process.env.EMAIL_REPLY_TO ? { reply_to: process.env.EMAIL_REPLY_TO } : {}),
    }),
    cache: 'no-store',
  })
  const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string }
  if (!response.ok || !data.id) {
    return { sent: false, reason: `Resend ${response.status}: ${data.name ?? ''} ${data.message ?? ''}`.trim() }
  }
  return { sent: true, id: data.id }
}

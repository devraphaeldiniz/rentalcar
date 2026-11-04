// Disparo dos e-mails da reserva, com trava no banco para nunca mandar duas vezes.
import { adminGraphql } from '@/lib/auth/authorization'
import { addDaysIso, todayIso } from '@/lib/rental'
import { sendEmail } from './send'
import { confirmationEmail, reminderEmail, type EmailBooking } from './templates'

const FIELDS = 'id start_date end_date total_amount customer_name customer_email payment_method payment_status status vehicle { brand model }'
type Row = EmailBooking & { status: string }
type Column = 'confirmation_email_sent_at' | 'reminder_email_sent_at'

/** Marca o envio antes de mandar: só quem conseguir marcar (coluna ainda nula) envia. */
async function claim(id: string, column: Column) {
  const data = await adminGraphql<{ update_bookings: { returning: Row[] } }>(
    `mutation Claim($id: uuid!, $now: timestamptz!) {
      update_bookings(where: { id: { _eq: $id }, ${column}: { _is_null: true } }, _set: { ${column}: $now }) { returning { ${FIELDS} } }
    }`,
    { id, now: new Date().toISOString() },
  )
  return data.update_bookings.returning[0] ?? null
}

/** Falhou o envio: libera a trava para tentar de novo depois. */
async function release(id: string, column: Column) {
  await adminGraphql(`mutation Release($id: uuid!) { update_bookings_by_pk(pk_columns: { id: $id }, _set: { ${column}: null }) { id } }`, { id }).catch(() => {})
}

async function deliver(booking: Row, column: Column, build: (b: EmailBooking) => { subject: string; html: string; text: string }) {
  if (!booking.customer_email) return { sent: false as const, reason: 'reserva sem e-mail' }
  const message = build(booking)
  const result = await sendEmail({ to: booking.customer_email, ...message, idempotencyKey: `${column}:${booking.id}` })
  if (!result.sent) {
    await release(booking.id, column)
    console.error(`[email] ${column} ${booking.id}: ${result.reason}`)
  }
  return result
}

/**
 * E-mail de confirmação: reserva com pagamento na retirada (ao criar) ou paga online (ao aprovar).
 * Reserva online ainda não paga não recebe nada: o e-mail sai quando o pagamento for aprovado.
 */
export async function sendBookingConfirmation(bookingId: string) {
  try {
    const { bookings_by_pk: b } = await adminGraphql<{ bookings_by_pk: Row | null }>(
      `query B($id: uuid!) { bookings_by_pk(id: $id) { ${FIELDS} } }`,
      { id: bookingId },
    )
    if (!b || !['pending', 'confirmed'].includes(b.status)) return { sent: false as const, reason: 'reserva inativa' }
    if (b.payment_method === 'online' && b.payment_status !== 'paid') return { sent: false as const, reason: 'aguardando pagamento' }
    const claimed = await claim(bookingId, 'confirmation_email_sent_at')
    if (!claimed) return { sent: false as const, reason: 'já enviado' }
    return await deliver(claimed, 'confirmation_email_sent_at', confirmationEmail)
  } catch (error) {
    console.error('[email] confirmação', bookingId, error)
    return { sent: false as const, reason: 'erro' }
  }
}

/** Data de retirada que recebe o lembrete hoje: amanhã, no horário de Brasília. */
export const reminderTargetDate = (now: Date = new Date()) => addDaysIso(todayIso(now), 1)

/** Lembrete da véspera para todas as reservas ativas que retiram amanhã. */
export async function sendPickupReminders(now: Date = new Date()) {
  const target = reminderTargetDate(now)
  const { bookings } = await adminGraphql<{ bookings: { id: string }[] }>(
    `query Due($date: date!) {
      bookings(where: {
        start_date: { _eq: $date }
        status: { _in: ["pending", "confirmed"] }
        reminder_email_sent_at: { _is_null: true }
        _or: [{ payment_method: { _neq: "online" } }, { payment_status: { _eq: "paid" } }]
      }, limit: 200) { id }
    }`,
    { date: target },
  )
  let sent = 0
  let failed = 0
  for (const { id } of bookings) {
    const claimed = await claim(id, 'reminder_email_sent_at').catch(() => null)
    if (!claimed) continue
    const result = await deliver(claimed, 'reminder_email_sent_at', reminderEmail)
    if (result.sent) sent++
    else failed++
  }
  return { date: target, due: bookings.length, sent, failed }
}

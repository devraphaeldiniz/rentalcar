// Conta de demonstração: recrutadores e visitantes entram com um clique,
// sem criar conta. A senha fica só nas variáveis do servidor.

export const DEMO_EMAIL = (process.env.DEMO_CLIENT_EMAIL ?? '').trim().toLowerCase()
const DEMO_PASSWORD = process.env.DEMO_CLIENT_PASSWORD ?? ''

export const demoEnabled = () => Boolean(DEMO_EMAIL && DEMO_PASSWORD)
export const demoCredentials = () => ({ email: DEMO_EMAIL, password: DEMO_PASSWORD })

/** A conta de demonstração é compartilhada: dados e senha não podem ser trocados. */
export const isDemoAccount = (email: string | null | undefined) => Boolean(DEMO_EMAIL && email?.trim().toLowerCase() === DEMO_EMAIL)

export const DEMO_LOCKED_MESSAGE = 'Na conta de demonstração os dados e a senha não podem ser alterados. Crie sua conta para testar isso.'

/**
 * Limites da conta de demonstração. Ela é compartilhada por quem visita o portfólio,
 * então não pode segurar a frota: poucas reservas abertas, períodos curtos e datas próximas.
 */
export const DEMO_LIMITS = { openBookings: 2, maxDays: 7, maxAdvanceDays: 60 } as const

/** Pagamento online na demonstração só quando ligado de propósito (ex.: credenciais de teste do Mercado Pago). */
export const demoOnlinePayment = () => process.env.DEMO_ONLINE_PAYMENT === 'on'

/** Informações que o navegador precisa para avisar dos limites antes de enviar a reserva. */
export const demoInfo = (email: string | null | undefined) =>
  isDemoAccount(email) ? { limits: DEMO_LIMITS, onlinePayment: demoOnlinePayment() } : null

/** Motivo para recusar a reserva da conta de demonstração, ou null se está dentro dos limites. */
export function demoBookingProblem(input: { openBookings: number; days: number; startDate: string; today: string }): string | null {
  if (input.openBookings >= DEMO_LIMITS.openBookings) {
    return `Na demonstração dá para ter até ${DEMO_LIMITS.openBookings} reservas abertas. Cancele uma em Minhas reservas para fazer outra.`
  }
  if (input.days > DEMO_LIMITS.maxDays) {
    return `Na demonstração o período vai até ${DEMO_LIMITS.maxDays} diárias. Crie sua conta para reservar por mais tempo.`
  }
  const advance = Math.round((Date.parse(`${input.startDate}T00:00:00Z`) - Date.parse(`${input.today}T00:00:00Z`)) / 86_400_000)
  if (advance > DEMO_LIMITS.maxAdvanceDays) {
    return `Na demonstração a retirada precisa ser nos próximos ${DEMO_LIMITS.maxAdvanceDays} dias.`
  }
  return null
}

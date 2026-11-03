// Vocabulário do monitoramento, compartilhado entre navegador, API e painel.

export const EVENTS = [
  'page_view',
  'search',
  'view_vehicle',
  'start_checkout',
  'booking_created',
  'checkout_feedback',
] as const
export type AnalyticsEvent = (typeof EVENTS)[number]

/** Eventos que o navegador pode enviar. A reserva concluída só é gravada pelo servidor. */
export const CLIENT_EVENTS = ['page_view', 'search', 'view_vehicle', 'start_checkout', 'checkout_feedback'] as const
export type ClientEvent = (typeof CLIENT_EVENTS)[number]

/** Motivos oferecidos a quem desiste no checkout. */
export const FEEDBACK_REASONS = {
  preco: 'Achei caro',
  concorrencia: 'Vou alugar em outra locadora',
  datas: 'As datas não deram certo',
  carro: 'Não achei o carro que queria',
  pesquisando: 'Só estou pesquisando',
  duvida: 'Fiquei com dúvida sobre a reserva',
  outro: 'Outro motivo',
} as const
export type FeedbackReason = keyof typeof FEEDBACK_REASONS

export const CONSENT_KEY = 'astacar-consent'
export type Consent = 'granted' | 'denied'

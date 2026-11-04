// Regras da locação mostradas no checkout e na página /termos.
// Ficam no código (versionadas) para que a reserva sempre aponte para um texto conhecido.

export const TERMS_VERSION = '2026-11'

export const REQUIREMENTS = [
  { title: 'Idade mínima de 21 anos', text: 'O condutor principal e os adicionais precisam ter 21 anos ou mais.' },
  { title: 'CNH há pelo menos 2 anos', text: 'Carteira de habilitação definitiva e válida, apresentada na retirada junto com um documento com foto.' },
  { title: 'Cartão de crédito no nome do condutor', text: 'Usado para a caução na retirada. O valor é liberado após a devolução sem pendências.' },
] as const

export const POLICIES = [
  { title: 'Quilometragem livre', text: 'Rode quanto quiser, sem cobrança por quilômetro.' },
  { title: 'Combustível', text: 'Devolva com o mesmo nível da retirada ou contrate o tanque cheio pré-pago. Se faltar, o reabastecimento é cobrado.' },
  { title: 'Cancelamento gratuito', text: 'Cancele pelo site, em Minhas reservas, até a data da retirada, sem custo.' },
  { title: 'Atraso na devolução', text: 'Tolerância de 1 hora. Depois disso é cobrada uma diária adicional.' },
  { title: 'Avarias', text: 'Danos são cobertos conforme a proteção escolhida; a franquia é o valor máximo que você paga por ocorrência.' },
] as const

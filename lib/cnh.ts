import { z } from 'zod'
import { isIsoDate } from '@/lib/rental'

// CNH no perfil: conferida no servidor antes de cada reserva.
// Regras da locação (lib/policies.ts): CNH válida na retirada e habilitação há pelo menos 2 anos.

export const MIN_LICENSE_YEARS = 2
/** Categorias que dirigem carro de passeio. */
export const CAR_CATEGORIES = ['B', 'AB', 'C', 'AC', 'D', 'AD', 'E', 'AE'] as const

export type CnhData = {
  cnh_number: string | null
  cnh_category: string | null
  cnh_expires_on: string | null
  cnh_first_issued_on: string | null
}

/** Número de registro da CNH (11 dígitos) com os dois dígitos verificadores. */
export function isValidCnh(input: string): boolean {
  const cnh = input.replace(/\D/g, '')
  if (cnh.length !== 11 || /^(\d)\1{10}$/.test(cnh)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cnh[i]) * (9 - i)
  let dv1 = sum % 11
  let discount = 0
  if (dv1 >= 10) {
    dv1 = 0
    discount = 2
  }
  sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cnh[i]) * (i + 1)
  const rest = sum % 11
  const dv2 = rest >= 10 ? 0 : rest - discount
  return dv2 >= 0 && `${dv1}${dv2}` === cnh.slice(9)
}

const yearsBefore = (iso: string, years: number) => `${Number(iso.slice(0, 4)) - years}${iso.slice(4)}`

/**
 * Motivos para a CNH não servir para uma retirada nessa data. Lista vazia = pode reservar.
 * As mensagens vão direto para a tela.
 */
export function cnhProblems(cnh: CnhData | null | undefined, pickupDate: string): string[] {
  if (!cnh?.cnh_number) return ['Cadastre sua CNH para reservar.']
  const problems: string[] = []
  if (!isValidCnh(cnh.cnh_number)) problems.push('O número da CNH não confere. Revise no seu perfil.')
  if (!cnh.cnh_category || !(CAR_CATEGORIES as readonly string[]).includes(cnh.cnh_category)) problems.push('A CNH precisa ser de categoria B (ou superior) para dirigir carro.')
  if (!cnh.cnh_expires_on) problems.push('Informe a validade da CNH.')
  else if (cnh.cnh_expires_on < pickupDate) problems.push('Sua CNH vence antes da retirada. Renove ou atualize a validade no perfil.')
  if (!cnh.cnh_first_issued_on) problems.push('Informe a data da primeira habilitação.')
  else if (cnh.cnh_first_issued_on > yearsBefore(pickupDate, MIN_LICENSE_YEARS)) problems.push(`É preciso ter habilitação há pelo menos ${MIN_LICENSE_YEARS} anos na data da retirada.`)
  return problems
}

export const cnhInput = z
  .object({
    cnh_number: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .refine(isValidCnh, 'Número da CNH inválido. São 11 dígitos, no campo "Nº registro".'),
    cnh_category: z.enum(CAR_CATEGORIES, { message: 'Escolha a categoria da CNH.' }),
    cnh_expires_on: z.string().refine(isIsoDate, 'Validade inválida'),
    cnh_first_issued_on: z.string().refine(isIsoDate, 'Data da 1ª habilitação inválida').refine((d) => d >= '1940-01-01', 'Data da 1ª habilitação inválida'),
  })
  .refine((c) => c.cnh_first_issued_on < c.cnh_expires_on, { message: 'A primeira habilitação precisa ser antes da validade.', path: ['cnh_first_issued_on'] })

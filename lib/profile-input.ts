import { z } from 'zod'
import { isValidCpf } from '@/lib/rental'

const onlyDigits = (v: string) => v.replace(/\D/g, '')

/** Nome, telefone e CPF: mesma validação quando o cliente edita os próprios dados e quando o admin edita. */
export const profileInput = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo').max(120),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? onlyDigits(v) : ''))
    .refine((v) => v === '' || (v.length >= 10 && v.length <= 13), 'Telefone com DDD, só números'),
  cpf: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : ''))
    .refine((v) => v === '' || isValidCpf(v), 'CPF inválido. Confira os números.'),
})

/** Mensagem amigável para o CPF repetido (índice único profiles_cpf_key). */
export const isDuplicateCpf = (error: unknown) => String((error as Error)?.message ?? error).includes('profiles_cpf_key')

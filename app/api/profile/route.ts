export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { DEMO_LOCKED_MESSAGE, isDemoAccount } from '@/lib/demo'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'
import { isValidCpf } from '@/lib/rental'

type Profile = { full_name: string | null; phone: string | null; cpf: string | null; email: string; role: string; created_at: string }

export async function GET() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  try {
    const data = await adminGraphql<{ profiles_by_pk: Profile | null }>(
      'query Me($id: uuid!) { profiles_by_pk(id: $id) { full_name phone cpf email role created_at } }',
      { id: auth.userId },
    )
    return NextResponse.json({ profile: data.profiles_by_pk })
  } catch (error) {
    console.error('[profile GET]', error)
    return NextResponse.json({ error: 'Erro ao carregar seus dados' }, { status: 500 })
  }
}

const onlyDigits = (v: string) => v.replace(/\D/g, '')

const input = z.object({
  fullName: z.string().trim().min(3, 'Informe o nome completo').max(120),
  phone: z.string().trim().max(20).optional().transform((v) => (v ? onlyDigits(v) : '')).refine((v) => v === '' || (v.length >= 10 && v.length <= 13), 'Telefone com DDD, só números'),
  cpf: z.string().trim().optional().transform((v) => (v ? onlyDigits(v) : '')).refine((v) => v === '' || isValidCpf(v), 'CPF inválido. Confira os números.'),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (isDemoAccount(auth.email)) return NextResponse.json({ error: DEMO_LOCKED_MESSAGE }, { status: 403 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { fullName, phone, cpf } = parsed.data

  try {
    await adminGraphql(
      `mutation UpdateMe($id: uuid!, $set: profiles_set_input!, $name: String!) {
        update_profiles_by_pk(pk_columns: { id: $id }, _set: $set) { id }
        updateUser(pk_columns: { id: $id }, _set: { displayName: $name }) { id }
      }`,
      { id: auth.userId, set: { full_name: fullName, phone: phone || null, cpf: cpf || null }, name: fullName },
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = String((error as Error).message)
    if (message.includes('profiles_cpf_key')) {
      return NextResponse.json({ error: 'Este CPF já está cadastrado em outra conta.' }, { status: 409 })
    }
    console.error('[profile PATCH]', error)
    return NextResponse.json({ error: 'Erro ao salvar seus dados' }, { status: 500 })
  }
}

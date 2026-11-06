export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { adminGraphql, requireUser } from '@/lib/auth/authorization'
import { type CnhData, cnhInput, cnhProblems } from '@/lib/cnh'
import { DEMO_LOCKED_MESSAGE, isDemoAccount } from '@/lib/demo'
import { isIsoDate, todayIso } from '@/lib/rental'

const FIELDS = 'cnh_number cnh_category cnh_expires_on cnh_first_issued_on'

/** CNH do perfil e se ela serve para retirar na data informada (?retirada=AAAA-MM-DD, padrão: hoje). */
export async function GET(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const pickup = req.nextUrl.searchParams.get('retirada')
  const date = isIsoDate(pickup) ? pickup : todayIso()
  // Conta de demonstração: compartilhada, não guarda documento de ninguém.
  if (isDemoAccount(auth.email)) return NextResponse.json({ cnh: null, problems: [], demo: true })
  try {
    const data = await adminGraphql<{ profiles_by_pk: CnhData | null }>(`query C($id: uuid!) { profiles_by_pk(id: $id) { ${FIELDS} } }`, { id: auth.userId })
    const cnh = data.profiles_by_pk
    return NextResponse.json({ cnh: cnh?.cnh_number ? { ...cnh, cnh_number: `•••••••${cnh.cnh_number.slice(-4)}` } : null, problems: cnhProblems(cnh, date) })
  } catch (error) {
    console.error('[profile/cnh GET]', error)
    return NextResponse.json({ error: 'Não foi possível carregar sua CNH. A migração 016 já foi aplicada?' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (isDemoAccount(auth.email)) return NextResponse.json({ error: DEMO_LOCKED_MESSAGE }, { status: 403 })
  const parsed = cnhInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql('mutation S($id: uuid!, $set: profiles_set_input!) { update_profiles_by_pk(pk_columns: { id: $id }, _set: $set) { id } }', {
      id: auth.userId,
      set: parsed.data,
    })
    return NextResponse.json({ success: true, problems: cnhProblems(parsed.data, todayIso()) })
  } catch (error) {
    if (String(error).includes('profiles_cnh_number_key') || String(error).includes('Uniqueness')) {
      return NextResponse.json({ error: 'Esta CNH já está cadastrada em outra conta.' }, { status: 409 })
    }
    console.error('[profile/cnh PUT]', error)
    return NextResponse.json({ error: 'Não foi possível salvar sua CNH' }, { status: 500 })
  }
}

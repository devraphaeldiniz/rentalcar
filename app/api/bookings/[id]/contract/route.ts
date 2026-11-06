export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, getUserRole, requireUser } from '@/lib/auth/authorization'
import { buildContractPdf, type ContractData, contractCode } from '@/lib/contract'

const FIELDS = `id user_id start_date end_date total_amount status payment_status payment_method price_lines coupon_code
  terms_accepted_at created_at customer_name customer_email
  vehicle { brand model year plate color category }
  profile { full_name phone cpf }`

/** Contrato da reserva em PDF. Só o dono da reserva ou um admin baixam. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })

  try {
    const data = await adminGraphql<{ bookings_by_pk: (ContractData & { user_id: string }) | null }>(
      `query Contract($id: uuid!) { bookings_by_pk(id: $id) { ${FIELDS} } }`,
      { id },
    )
    const booking = data.bookings_by_pk
    // Reserva de outra pessoa responde igual a uma que não existe.
    if (!booking || (booking.user_id !== auth.userId && (await getUserRole(auth.userId)) !== 'admin')) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    }
    const pdf = buildContractPdf(booking).output('arraybuffer')
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="contrato-${contractCode(booking.id).toLowerCase()}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[bookings/contract]', error)
    return NextResponse.json({ error: 'Não foi possível gerar o contrato agora' }, { status: 500 })
  }
}

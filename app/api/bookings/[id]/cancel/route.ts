export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, adminGraphql } from '@/lib/auth/authorization'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

// O cliente cancela a própria reserva enquanto ela ainda não começou.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!z.string().uuid().safeParse(params.id).success) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }

  try {
    const { bookings_by_pk: b } = await adminGraphql<{
      bookings_by_pk: { user_id: string; status: string; start_date: string } | null
    }>('query B($id: uuid!) { bookings_by_pk(id: $id) { user_id status start_date } }', { id: params.id })

    if (!b || b.user_id !== auth.userId) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
    if (!['pending', 'confirmed'].includes(b.status)) {
      return NextResponse.json({ error: 'Esta reserva não pode mais ser cancelada.' }, { status: 409 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (b.start_date <= today) {
      return NextResponse.json({ error: 'A retirada já começou. Fale com o atendimento para cancelar.' }, { status: 409 })
    }

    await adminGraphql(
      `mutation C($id: uuid!) { update_bookings_by_pk(pk_columns: { id: $id }, _set: { status: "cancelled" }) { id } }`,
      { id: params.id },
    )
    await createAuditLog({
      userId: auth.userId,
      action: 'booking.cancelled',
      resource: 'booking',
      resourceId: params.id,
      ipAddress: await getClientIP(),
      userAgent: await getUserAgent(),
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[bookings/cancel]', error)
    return NextResponse.json({ error: 'Erro ao cancelar a reserva' }, { status: 500 })
  }
}

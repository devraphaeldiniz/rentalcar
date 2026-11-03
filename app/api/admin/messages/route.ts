export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin, adminGraphql } from '@/lib/auth/authorization'

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ contact_messages: unknown[] }>(
      `query Messages { contact_messages(order_by: { created_at: desc }, limit: 200) { id name email phone subject message read created_at } }`,
    )
    return NextResponse.json({ messages: data.contact_messages })
  } catch (error) {
    console.error('[admin/messages]', error)
    return NextResponse.json({ error: 'Erro ao carregar as mensagens' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const parsed = z.object({ id: z.string().uuid(), read: z.boolean() }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    await adminGraphql(
      `mutation Read($id: uuid!, $read: Boolean!) { update_contact_messages_by_pk(pk_columns: { id: $id }, _set: { read: $read }) { id } }`,
      parsed.data,
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/messages PATCH]', error)
    return NextResponse.json({ error: 'Erro ao atualizar a mensagem' }, { status: 500 })
  }
}

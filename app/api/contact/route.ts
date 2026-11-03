export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql } from '@/lib/auth/authorization'
import { getClientIP } from '@/lib/utils/ip'

const input = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email: z.string().trim().email('Informe um e-mail válido.').max(200),
  phone: z.string().trim().max(30).optional(),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(5, 'Escreva sua mensagem.').max(3000, 'Mensagem longa demais (máximo 3.000 caracteres).'),
  website: z.string().max(0).optional(), // campo-isca: robôs preenchem, pessoas não veem
})

const MAX_PER_HOUR = 5

export async function POST(req: NextRequest) {
  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { website, ...msg } = parsed.data
  void website
  const ip = await getClientIP()

  try {
    // Limite simples por IP para evitar spam.
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recent = await adminGraphql<{ contact_messages_aggregate: { aggregate: { count: number } } }>(
      `query Recent($ip: inet!, $since: timestamptz!) {
        contact_messages_aggregate(where: { ip_address: { _eq: $ip }, created_at: { _gte: $since } }) { aggregate { count } }
      }`,
      { ip, since },
    )
    if (recent.contact_messages_aggregate.aggregate.count >= MAX_PER_HOUR) {
      return NextResponse.json({ error: 'Você já enviou várias mensagens. Tente de novo mais tarde.' }, { status: 429 })
    }

    await adminGraphql(
      `mutation Send($o: contact_messages_insert_input!) { insert_contact_messages_one(object: $o) { id } }`,
      { o: { ...msg, phone: msg.phone || null, subject: msg.subject || null, ip_address: ip } },
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[contact]', error)
    return NextResponse.json({ error: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' }, { status: 500 })
  }
}

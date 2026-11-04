export const dynamic = 'force-dynamic'

import { timingSafeEqual } from 'node:crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { sendPickupReminders } from '@/lib/email/booking-emails'

// Chamado todo dia às 18h (Brasília) pelo Vercel Cron (vercel.json).
// A Vercel envia "Authorization: Bearer <CRON_SECRET>"; sem o segredo certo, nada roda.
function authorized(header: string | null, secret: string | undefined) {
  if (!secret || secret.length < 16 || !header) return false
  const a = Buffer.from(header)
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!authorized(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await sendPickupReminders()
    console.log('[cron/lembretes]', JSON.stringify(result))
    return NextResponse.json(result)
  } catch (error) {
    console.error('[cron/lembretes]', error)
    return NextResponse.json({ error: 'Falha ao enviar lembretes' }, { status: 500 })
  }
}

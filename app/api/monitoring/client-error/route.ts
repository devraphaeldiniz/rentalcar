export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { recordError } from '@/lib/monitoring/errors'
import { getClientIP } from '@/lib/utils/ip'

const input = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().max(5000).optional(),
  path: z.string().max(500).optional(),
  digest: z.string().max(100).optional(),
  kind: z.enum(['render', 'global', 'window', 'promise']).optional(),
})

// Rota pública (o erro acontece no navegador de qualquer visitante), então tem limite por IP.
const WINDOW = 10 * 60 * 1000
const MAX_PER_WINDOW = 20
const hits = new Map<string, { n: number; reset: number }>()
function allowed(ip: string) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || h.reset < now) {
    if (hits.size > 5000) hits.clear()
    hits.set(ip, { n: 1, reset: now + WINDOW })
    return true
  }
  h.n += 1
  return h.n <= MAX_PER_WINDOW
}

export async function POST(req: NextRequest) {
  // Só aceita relatos vindos do próprio site.
  const origin = req.headers.get('origin')
  if (origin && origin !== req.nextUrl.origin) return new NextResponse(null, { status: 403 })
  if (!allowed(await getClientIP())) return new NextResponse(null, { status: 429 })

  const parsed = input.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return new NextResponse(null, { status: 400 })
  const { message, stack, path, digest, kind } = parsed.data
  await recordError({
    source: 'client',
    message,
    stack,
    path,
    digest,
    route: kind ? `navegador:${kind}` : 'navegador',
    userAgent: req.headers.get('user-agent'),
  })
  return new NextResponse(null, { status: 204 })
}

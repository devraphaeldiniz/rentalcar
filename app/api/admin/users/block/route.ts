export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/authorization'

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const { userId, block } = await req.json()

    // TODO: Atualizar disabled no banco
    console.log(`User ${userId} ${block ? 'blocked' : 'unblocked'}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao bloquear usuário' },
      { status: 500 }
    )
  }
}

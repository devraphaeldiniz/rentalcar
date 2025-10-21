import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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

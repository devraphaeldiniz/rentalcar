import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { userId, role } = await req.json()

    // TODO: Atualizar role no banco
    console.log(`User ${userId} role changed to ${role}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao alterar role' },
      { status: 500 }
    )
  }
}

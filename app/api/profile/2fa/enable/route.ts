export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// A ativação ainda não verifica o código nem grava o segredo no banco.
// Até isso existir, a rota responde com erro em vez de fingir sucesso
// e devolver códigos de backup que não valem nada.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'A ativação do 2FA ainda está em desenvolvimento.' },
    { status: 501 },
  )
}

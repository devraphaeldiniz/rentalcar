export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// Ver enable/route.ts: o 2FA ainda não é gravado no banco.
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'A desativação do 2FA ainda está em desenvolvimento.' },
    { status: 501 },
  )
}

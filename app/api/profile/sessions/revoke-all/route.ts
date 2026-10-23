export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST() {
  // TODO: Revogar todas as outras sessões exceto a atual
  
  return NextResponse.json({ success: true })
}

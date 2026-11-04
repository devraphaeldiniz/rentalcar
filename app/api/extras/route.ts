export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getActiveExtras } from '@/lib/extras-server'

// Lista pública: preços de proteções e opcionais mostrados no checkout.
export async function GET() {
  try {
    return NextResponse.json({ extras: await getActiveExtras() })
  } catch (error) {
    console.error('[extras]', error)
    return NextResponse.json({ extras: [] }, { status: 200 })
  }
}

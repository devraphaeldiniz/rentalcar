import { NextRequest, NextResponse } from 'next/server'
import { recordLoginAttempt } from '@/lib/security/rate-limit'
import { getClientIP } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  try {
    const { email, success, failureReason } = await req.json()
    const ip = await getClientIP()

    await recordLoginAttempt(email, ip, success, failureReason)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to log attempt' }, { status: 500 })
  }
}
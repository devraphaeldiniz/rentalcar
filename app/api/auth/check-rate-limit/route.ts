import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { getClientIP } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    const ip = await getClientIP()

    const result = await checkRateLimit(email || ip)

    return NextResponse.json({
      allowed: result.allowed,
      remaining: result.remaining,
      resetMinutes: Math.ceil((result.resetAt.getTime() - Date.now()) / 60000)
    })
  } catch (error) {
    return NextResponse.json({ allowed: true }, { status: 200 })
  }
}
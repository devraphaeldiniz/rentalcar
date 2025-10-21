import { NextRequest, NextResponse } from 'next/server'
import { createAuditLog } from '@/lib/security/audit'
import { getClientIP, getUserAgent } from '@/lib/utils/ip'

export async function POST(req: NextRequest) {
  try {
    const { action, userId, resource, resourceId, metadata } = await req.json()
    const ip = await getClientIP()
    const userAgent = await getUserAgent()

    await createAuditLog({
      userId,
      action,
      resource,
      resourceId,
      ipAddress: ip,
      userAgent,
      metadata,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create audit log' }, { status: 500 })
  }
}
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser, getUserRole } from '@/lib/auth/authorization'

export async function GET() {
  const auth = await requireUser()
  if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { user } = auth
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      emailVerified: Boolean(user.emailVerified),
      phoneNumber: user.phoneNumber ?? null,
      avatarUrl: user.avatarUrl ?? null,
      // Mesma fonte que o requireAdmin usa para liberar /api/admin/*
      role: await getUserRole(auth.userId),
      createdAt: user.createdAt ?? null,
    },
  })
}

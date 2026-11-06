export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireUser, getUserRole } from '@/lib/auth/authorization'

export async function GET(req: Request) {
  const auth = await requireUser()
  // ?soft=1: o cabeçalho pergunta em toda página; visitante sem login não é erro (evita 401 no console).
  if (!auth) {
    return new URL(req.url).searchParams.get('soft') === '1'
      ? NextResponse.json({ user: null })
      : NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

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

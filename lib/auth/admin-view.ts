import { NextResponse } from 'next/server'
import type { AdminViewer } from '@/lib/auth/authorization'
import { maskPersonalData } from '@/lib/demo-admin'

/** Resposta das rotas de leitura do painel: no modo demonstração, sai sem dados pessoais. */
export function viewerJson(viewer: AdminViewer, body: unknown, init?: ResponseInit) {
  return NextResponse.json(viewer.demo ? maskPersonalData(body) : body, init)
}

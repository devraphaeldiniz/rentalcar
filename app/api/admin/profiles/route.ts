export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ profiles: unknown[] }>(`
      query GetProfiles {
        profiles(order_by: { created_at: desc }) { id full_name phone cpf email email_verified role created_at blocked }
      }`)
    return viewerJson(viewer, { profiles: data.profiles })
  } catch (error) {
    console.error('[admin/profiles]', error)
    return viewerJson(viewer, { error: 'Erro ao buscar usuários' }, { status: 500 })
  }
}

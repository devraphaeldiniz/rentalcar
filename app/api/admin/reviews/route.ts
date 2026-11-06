export const dynamic = 'force-dynamic'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminGraphql, requireAdmin, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  try {
    const data = await adminGraphql<{ reviews: unknown[] }>(`
      query GetAllReviews {
        reviews(order_by: { created_at: desc }) {
          id rating comment status created_at
          user { email displayName }
          vehicle { brand model }
          booking { id }
        }
      }`)
    return viewerJson(viewer, data.reviews)
  } catch (error) {
    console.error('[admin/reviews]', error)
    return viewerJson(viewer, { error: 'Erro ao buscar avaliações' }, { status: 500 })
  }
}

const statusInput = z.object({ id: z.string().uuid(), status: z.enum(['pending', 'approved', 'rejected']) })

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  const parsed = statusInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  try {
    const data = await adminGraphql<{ update_reviews_by_pk: { id: string } | null }>(
      'mutation UpdateReviewStatus($id: uuid!, $status: String!) { update_reviews_by_pk(pk_columns: { id: $id }, _set: { status: $status }) { id } }',
      parsed.data,
    )
    if (!data.update_reviews_by_pk) return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    // A nota média do veículo é recalculada por trigger no banco
    // (reviews_refresh_vehicle_rating), só com avaliações aprovadas.
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/reviews PATCH]', error)
    return NextResponse.json({ error: 'Erro ao atualizar avaliação' }, { status: 500 })
  }
}

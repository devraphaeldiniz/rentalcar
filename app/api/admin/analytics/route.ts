export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requireAdmin, adminGraphql, requireAdminView } from '@/lib/auth/authorization'
import { viewerJson } from '@/lib/auth/admin-view'

// Indicadores calculados a partir das reservas reais (antes havia números fixos).
// Receita considera só reservas não canceladas.

type Row = { total_amount: number; status: string; created_at: string; vehicle: { brand: string; model: string } | null }

const monthKey = (iso: string) => iso.slice(0, 7)
const growth = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? 100 : 0)

export async function GET() {
  const viewer = await requireAdminView()
  if (!viewer) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  try {
    const data = await adminGraphql<{
      bookings: Row[]
      vehicles: { aggregate: { count: number } }
      available: { aggregate: { count: number } }
      users: { createdAt: string }[]
    }>(`query Analytics {
      bookings(order_by: { created_at: asc }) { total_amount status created_at vehicle { brand model } }
      vehicles: vehicles_aggregate { aggregate { count } }
      available: vehicles_aggregate(where: { status: { _eq: "available" } }) { aggregate { count } }
      users { createdAt }
    }`)

    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)

    const valid = data.bookings.filter((b) => b.status !== 'cancelled')
    const revenueBy = new Map<string, number>()
    const countBy = new Map<string, number>()
    for (const b of data.bookings) countBy.set(monthKey(b.created_at), (countBy.get(monthKey(b.created_at)) ?? 0) + 1)
    for (const b of valid) revenueBy.set(monthKey(b.created_at), (revenueBy.get(monthKey(b.created_at)) ?? 0) + Number(b.total_amount))

    const months = Array.from({ length: 6 }, (_, i) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)).toISOString().slice(0, 7))

    const statuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled']
    const rented = new Map<string, number>()
    for (const b of valid) {
      if (!b.vehicle) continue
      const name = `${b.vehicle.brand} ${b.vehicle.model}`
      rented.set(name, (rented.get(name) ?? 0) + 1)
    }

    const usersThisMonth = data.users.filter((u) => monthKey(u.createdAt) === thisMonth).length
    const usersPrev = data.users.filter((u) => monthKey(u.createdAt) === prev).length

    return viewerJson(viewer, {
      analytics: {
        revenue: {
          total: valid.reduce((s, b) => s + Number(b.total_amount), 0),
          growth: growth(revenueBy.get(thisMonth) ?? 0, revenueBy.get(prev) ?? 0),
          byMonth: months.map((m) => ({ month: m, revenue: revenueBy.get(m) ?? 0 })),
        },
        bookings: {
          total: data.bookings.length,
          growth: growth(countBy.get(thisMonth) ?? 0, countBy.get(prev) ?? 0),
          byStatus: statuses.map((status) => ({ status, count: data.bookings.filter((b) => b.status === status).length })),
        },
        vehicles: {
          total: data.vehicles.aggregate.count,
          available: data.available.aggregate.count,
          mostRented: [...rented.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([vehicle, count]) => ({ vehicle, count })),
        },
        users: {
          total: data.users.length,
          growth: growth(usersThisMonth, usersPrev),
          newThisMonth: usersThisMonth,
        },
      },
    })
  } catch (error) {
    console.error('[admin/analytics]', error)
    return viewerJson(viewer, { error: 'Erro ao calcular os indicadores' }, { status: 500 })
  }
}

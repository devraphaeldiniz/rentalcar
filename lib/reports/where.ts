import { isIsoDate } from '@/lib/rental'

/** Filtro de período dos relatórios: reservas que começam e terminam dentro dele. Datas inválidas são ignoradas. */
export function periodWhere(startDate: string | null, endDate: string | null): Record<string, unknown> {
  return isIsoDate(startDate) && isIsoDate(endDate) && startDate <= endDate
    ? { start_date: { _gte: startDate }, end_date: { _lte: endDate } }
    : {}
}

type ReportBooking = { total_amount: number | string; vehicle: { id: string; brand: string; model: string } | null }

/** Receita e número de reservas por carro, do que mais faturou para o que menos faturou. */
export function revenueByVehicle(bookings: ReportBooking[]) {
  const map = new Map<string, { brand: string; model: string; bookings: number; revenue: number }>()
  for (const b of bookings) {
    if (!b.vehicle) continue
    const row = map.get(b.vehicle.id) ?? { brand: b.vehicle.brand, model: b.vehicle.model, bookings: 0, revenue: 0 }
    row.bookings += 1
    // O Hasura pode devolver numeric como texto: sem Number(), "100" + "50" vira "10050".
    row.revenue = Math.round((row.revenue + Number(b.total_amount)) * 100) / 100
    map.set(b.vehicle.id, row)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue)
}

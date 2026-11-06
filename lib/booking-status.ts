import { adminGraphql } from '@/lib/auth/authorization'
import { releaseCoupon } from '@/lib/quote-server'

export const BOOKING_STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

type ChangeResult = { changed: boolean; coupon: string | null }

/**
 * Muda o status da reserva só se ela ainda estiver em um dos status de origem.
 * A condição vai no próprio UPDATE, então dois cliques (ou cliente e admin ao mesmo tempo)
 * não cancelam duas vezes nem devolvem o cupom duas vezes.
 * Ao cancelar, o uso do cupom volta para o limite.
 */
export async function changeBookingStatus(
  id: string,
  to: BookingStatus,
  from: readonly string[],
  extraSet: Record<string, unknown> = {},
): Promise<ChangeResult> {
  const data = await adminGraphql<{ update_bookings: { returning: { id: string; coupon_code: string | null }[] } }>(
    `mutation ChangeStatus($id: uuid!, $from: [String!]!, $set: bookings_set_input!) {
      update_bookings(where: { id: { _eq: $id }, status: { _in: $from } }, _set: $set) { returning { id coupon_code } }
    }`,
    { id, from: [...from], set: { ...extraSet, status: to } },
  )
  const row = data.update_bookings.returning[0]
  if (!row) return { changed: false, coupon: null }
  if (to === 'cancelled' && row.coupon_code) await releaseCoupon(row.coupon_code)
  return { changed: true, coupon: row.coupon_code }
}

/** Status de onde o admin pode sair. Reserva cancelada não reabre: o carro e o cupom já podem ter sido usados por outra. */
export function adminFromStatuses(to: BookingStatus): string[] {
  return BOOKING_STATUSES.filter((s) => s !== 'cancelled' && s !== to)
}

import { adminGraphql } from '@/lib/auth/authorization'
import type { Extra } from '@/lib/pricing'

type Row = Omit<Extra, 'price' | 'max_total'> & { price: string | number; max_total: string | number | null }

const toExtra = (r: Row): Extra => ({ ...r, price: Number(r.price), max_total: r.max_total == null ? null : Number(r.max_total) })

/** Proteções e opcionais ativos, na ordem de exibição. */
export async function getActiveExtras(): Promise<Extra[]> {
  const data = await adminGraphql<{ rental_extras: Row[] }>(
    `query Extras {
      rental_extras(where: { active: { _eq: true } }, order_by: [{ kind: desc }, { sort: asc }]) {
        code kind name description price pricing max_total is_default sort
      }
    }`,
  )
  return data.rental_extras.map(toExtra)
}

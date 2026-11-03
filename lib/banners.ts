import { adminGraphql } from '@/lib/auth/authorization'
import { todayIso } from '@/lib/rental'

export const PLACEMENTS = { home: 'Home, acima do catálogo', vehicle_sidebar: 'Página do carro, ao lado' } as const
export type Placement = keyof typeof PLACEMENTS
export const TONES = ['brand', 'electric', 'success', 'warning'] as const
export type Tone = (typeof TONES)[number]

export type Banner = {
  id: string
  placement: Placement
  title: string
  body: string | null
  cta_label: string | null
  cta_href: string | null
  coupon_code: string | null
  tone: Tone
  starts_on: string | null
  ends_on: string | null
  active: boolean
  sort: number
}

export const BANNER_FIELDS = 'id placement title body cta_label cta_href coupon_code tone starts_on ends_on active sort'

/** Banners ativos e dentro da vigência. Sem a tabela (banco antigo), não mostra nada. */
export async function getBanners(placement: Placement, limit = 3): Promise<Banner[]> {
  const today = todayIso()
  try {
    const data = await adminGraphql<{ banners: Banner[] }>(
      `query B($placement: String!, $today: date!, $limit: Int!) {
        banners(
          where: {
            placement: { _eq: $placement }, active: { _eq: true },
            _and: [
              { _or: [{ starts_on: { _is_null: true } }, { starts_on: { _lte: $today } }] },
              { _or: [{ ends_on: { _is_null: true } }, { ends_on: { _gte: $today } }] }
            ]
          }
          order_by: [{ sort: asc }, { created_at: desc }]
          limit: $limit
        ) { ${BANNER_FIELDS} }
      }`,
      { placement, today, limit },
    )
    return data.banners
  } catch {
    return []
  }
}

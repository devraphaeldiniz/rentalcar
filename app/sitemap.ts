import type { MetadataRoute } from 'next'
import { adminGraphql } from '@/lib/auth/authorization'
import { CATEGORY_SLUGS, SITE_URL } from '@/lib/site'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    ...Object.values(CATEGORY_SLUGS).map((slug) => ({
      url: `${SITE_URL}/aluguel/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...['/sobre', '/contato', '/termos', '/privacidade', '/creditos'].map((path) => ({
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    })),
  ]

  try {
    const data = await adminGraphql<{ vehicles: { id: string; updated_at: string | null }[] }>(
      `query S { vehicles(where: { status: { _neq: "maintenance" } }) { id updated_at } }`,
    )
    for (const v of data.vehicles) {
      pages.push({ url: `${SITE_URL}/vehicles/${v.id}`, lastModified: v.updated_at ? new Date(v.updated_at) : now, changeFrequency: 'weekly', priority: 0.6 })
    }
  } catch {}
  return pages
}

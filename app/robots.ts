import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Áreas privadas ou sem valor para busca.
      disallow: ['/admin', '/api/', '/auth/', '/profile', '/bookings/', '/vehicles/*/checkout'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

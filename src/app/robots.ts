import type { MetadataRoute } from 'next'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/member/',
          '/admin/',
          '/api/',
          '/bienvenue',
          '/auth/',
          // Pages personnelles / à jeton — jamais destinées à l'index Google.
          '/recu/',
          '/certificat/',
          '/destinee-acces',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/member/',
          '/admin/',
          '/api/',
          '/recu/',
          '/certificat/',
          '/destinee-acces',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}

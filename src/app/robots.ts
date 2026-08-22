import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site-url'

// Base canonique NORMALISÉE (sans slash final) : évite les doubles slashs
// (…org//sitemap.xml) quand NEXT_PUBLIC_APP_URL porte un slash final.
const BASE = SITE_URL

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

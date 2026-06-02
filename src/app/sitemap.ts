import type { MetadataRoute } from 'next'
import { PLATEFORMES } from '@/lib/constants'

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,                  changeFrequency: 'daily',   priority: 1.0,  lastModified: now },
    { url: `${BASE}/live`,              changeFrequency: 'hourly',  priority: 0.9,  lastModified: now },
    { url: `${BASE}/formations`,        changeFrequency: 'weekly',  priority: 0.9,  lastModified: now },
    { url: `${BASE}/podcast`,           changeFrequency: 'weekly',  priority: 0.85, lastModified: now },
    { url: `${BASE}/priere`,            changeFrequency: 'daily',   priority: 0.85, lastModified: now },
    { url: `${BASE}/evenements`,        changeFrequency: 'daily',   priority: 0.8,  lastModified: now },
    { url: `${BASE}/dons`,              changeFrequency: 'weekly',  priority: 0.8,  lastModified: now },
    { url: `${BASE}/rejoindre`,         changeFrequency: 'weekly',  priority: 0.85, lastModified: now },
    { url: `${BASE}/plateformes`,       changeFrequency: 'weekly',  priority: 0.8,  lastModified: now },
    { url: `${BASE}/notre-histoire`,    changeFrequency: 'monthly', priority: 0.7,  lastModified: now },
    { url: `${BASE}/temoignages`,       changeFrequency: 'weekly',  priority: 0.75, lastModified: now },
    { url: `${BASE}/groupes`,           changeFrequency: 'weekly',  priority: 0.7,  lastModified: now },
    { url: `${BASE}/contact`,           changeFrequency: 'monthly', priority: 0.65, lastModified: now },
    { url: `${BASE}/faq`,               changeFrequency: 'monthly', priority: 0.6,  lastModified: now },
    { url: `${BASE}/benevolat`,         changeFrequency: 'monthly', priority: 0.6,  lastModified: now },
    { url: `${BASE}/confidentialite`,   changeFrequency: 'yearly',  priority: 0.3,  lastModified: now },
    { url: `${BASE}/conditions`,        changeFrequency: 'yearly',  priority: 0.3,  lastModified: now },
  ]

  // Dynamic entries — pulled from the same source the routes use, so they stay in sync.
  const plateformesPages: MetadataRoute.Sitemap = Object.keys(PLATEFORMES).map((id) => ({
    url: `${BASE}/plateformes/${id}`,
    changeFrequency: 'monthly',
    priority: 0.7,
    lastModified: now,
  }))

  return [...staticPages, ...plateformesPages]
}

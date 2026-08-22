import type { MetadataRoute } from 'next'
import { PLATEFORMES } from '@/lib/constants'
import { cmsList, type CmsArticle } from '@/lib/cms'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { listPublishedShows, listPublishedSeries } from '@/lib/podcast/spine-public'
import { SITE_URL } from '@/lib/site-url'

// Base canonique NORMALISÉE (sans slash final) : évite les doubles slashs
// (…org//formations) quand NEXT_PUBLIC_APP_URL porte un slash final.
const BASE = SITE_URL

/**
 * Exécute une lecture serveur en la RENDANT résiliente : toute erreur (Supabase
 * non configuré, réseau, RLS) renvoie []. Le sitemap doit TOUJOURS se construire,
 * même sans base : on dégrade vers la liste statique, jamais un build cassé.
 */
async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  if (IS_DEMO_MODE) return []
  try {
    return (await fn()) ?? []
  } catch {
    return []
  }
}

/** Slugs de contenus publiés, lecture résiliente et sans donnée inventée. */
async function dynamicEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const [articles, formations, shows, series] = await Promise.all([
    // Articles publiés (mêmes filtres publics que la page /articles).
    safe(async () => {
      const rows = await cmsList<CmsArticle>('cms_articles', { publicOnly: true })
      return (rows ?? [])
        .map((a) => (a.slug ? String(a.slug) : ''))
        .filter(Boolean)
    }),
    // Formations publiées (statut='publie', même source que la page /formations).
    safe(async () => {
      const { data } = await supabaseAdmin
        .from('formations')
        .select('slug, statut')
        .eq('statut', 'publie')
      return (data ?? [])
        .map((f: { slug: string | null }) => (f.slug ? String(f.slug) : ''))
        .filter(Boolean)
    }),
    // Émissions podcast publiées (colonne éditoriale).
    safe(async () => {
      const rows = await listPublishedShows()
      return (rows ?? []).map((s) => s.slug).filter(Boolean)
    }),
    // Séries podcast publiées.
    safe(async () => {
      const rows = await listPublishedSeries()
      return (rows ?? []).map((s) => s.slug).filter(Boolean)
    }),
  ])

  // Déduplication par slug pour chaque type.
  const uniq = (arr: string[]) => Array.from(new Set(arr))

  const articlePages: MetadataRoute.Sitemap = uniq(articles).map((slug) => ({
    url: `${BASE}/articles/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
    lastModified: now,
  }))

  const formationPages: MetadataRoute.Sitemap = uniq(formations).map((slug) => ({
    url: `${BASE}/formations/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.7,
    lastModified: now,
  }))

  const showPages: MetadataRoute.Sitemap = uniq(shows).map((slug) => ({
    url: `${BASE}/podcast/emissions/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.7,
    lastModified: now,
  }))

  const seriesPages: MetadataRoute.Sitemap = uniq(series).map((slug) => ({
    url: `${BASE}/podcast/series/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.65,
    lastModified: now,
  }))

  return [...articlePages, ...formationPages, ...showPages, ...seriesPages]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,                  changeFrequency: 'daily',   priority: 1.0,  lastModified: now },
    { url: `${BASE}/ouverture`,         changeFrequency: 'daily',   priority: 0.95, lastModified: now },
    { url: `${BASE}/ouverture/vision`,  changeFrequency: 'weekly',  priority: 0.85, lastModified: now },
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
    { url: `${BASE}/enseignements`,     changeFrequency: 'weekly',  priority: 0.8,  lastModified: now },
    { url: `${BASE}/articles`,          changeFrequency: 'weekly',  priority: 0.7,  lastModified: now },
    { url: `${BASE}/servir`,            changeFrequency: 'monthly', priority: 0.7,  lastModified: now },
    { url: `${BASE}/partenariat`,       changeFrequency: 'monthly', priority: 0.7,  lastModified: now },
    { url: `${BASE}/communaute`,        changeFrequency: 'weekly',  priority: 0.7,  lastModified: now },
    { url: `${BASE}/parcours`,          changeFrequency: 'monthly', priority: 0.7,  lastModified: now },
    { url: `${BASE}/groupes`,           changeFrequency: 'weekly',  priority: 0.7,  lastModified: now },
    { url: `${BASE}/contact`,           changeFrequency: 'monthly', priority: 0.65, lastModified: now },
    { url: `${BASE}/faq`,               changeFrequency: 'monthly', priority: 0.6,  lastModified: now },
    { url: `${BASE}/benevolat`,         changeFrequency: 'monthly', priority: 0.6,  lastModified: now },
    { url: `${BASE}/academie`,          changeFrequency: 'weekly',  priority: 0.75, lastModified: now },
    { url: `${BASE}/marketplace`,       changeFrequency: 'weekly',  priority: 0.65, lastModified: now },
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

  // Contenus dynamiques (articles, formations, émissions/séries podcast).
  // Lecture résiliente : sur échec ou base non configurée, on retombe
  // simplement sur les pages statiques (jamais d'exception au build).
  const contentPages = await dynamicEntries(now)

  return [...staticPages, ...plateformesPages, ...contentPages]
}

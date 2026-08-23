/**
 * CITADELLE INTELLIGENCE HUB — SEO · GET /api/intelligence/seo (admin-only)
 *
 * AGRÉGATEUR du cockpit SEO. Compose un `SeoIntelligencePayload` honnête à
 * partir de trois sources pures/normalisées :
 *  - Search Console (connecteur, fenêtre courante + précédente pour la tendance)
 *  - GA4 organique (connecteur)
 *  - Audit technique on-page (pur)
 *
 * Sécurité :
 *  - ADMIN_ONLY : gardé par `isAdminRequest` (le middleware ne couvre PAS
 *    /api/intelligence). 401 sinon.
 *  - Aucun secret exposé. Un connecteur non configuré reste `NOT_CONFIGURED` —
 *    JAMAIS de donnée inventée. Une erreur renvoie un payload honnête et vide.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { cached } from '@/lib/cache'
import { getSearchConsoleSeo } from '@/lib/intelligence/connectors/google-search-console'
import { getGa4OrganicSeo } from '@/lib/intelligence/connectors/google-analytics'
import { auditTechnicalSeo } from '@/lib/intelligence/seo/technical/audit'
import { buildSeoPeriod, parsePeriodKey } from '@/lib/intelligence/seo/period'
import { PUBLIC_BASE_URL } from '@/lib/intelligence/seo/important-routes'
import { buildSeoOverview } from '@/lib/intelligence/seo/overview'
import { detectOpportunities } from '@/lib/intelligence/seo/opportunities'
import { parseSeoScope, annotatePagesScope, annotateOpportunitiesScope } from '@/lib/intelligence/seo/scope-aggregate'
import type {
  SeoConnectorStatus,
  SeoIntelligencePayload,
  SeoPeriod,
} from '@/lib/intelligence/seo/types'

export const dynamic = 'force-dynamic'

const SEO_TTL_MS = 60_000 // 1 min : GSC est déjà en J-2, un cache court suffit.

/** Statut « NOT_CONFIGURED » honnête pour le fail-safe. */
function notConfigured(
  connector: SeoConnectorStatus['connector'],
  checkedAt: string,
  reason: string,
): SeoConnectorStatus {
  return { connector, state: 'NOT_CONFIGURED', configured: false, reason, checkedAt }
}

/** Fenêtre précédente présentée comme une période (pour un 2e appel connecteur). */
function previousWindow(period: SeoPeriod): SeoPeriod {
  return {
    key: period.key,
    from: period.prevFrom,
    to: period.prevTo,
    prevFrom: period.prevFrom,
    prevTo: period.prevTo,
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()
  const key = parsePeriodKey(req.nextUrl.searchParams.get('period'))
  const period = buildSeoPeriod(key, Date.now())
  // Portée sélectionnée (défaut = citadelle). Présentation uniquement : ne
  // change NI la propriété GSC, NI les appels externes. La donnée reste classée
  // par hôte réel et n'est jamais tronquée du signal institutionnel.
  const selectedScope = parseSeoScope(req.nextUrl.searchParams.get('scope'))

  try {
    const dayBucket = nowIso.slice(0, 13) // AAAA-MM-JJTHH → clé stable dans le TTL
    const payload = await cached<SeoIntelligencePayload>(
      `hub:seo:${key}:${dayBucket}`,
      SEO_TTL_MS,
      async () => {
        const prevPeriod = previousWindow(period)
        // Fenêtre courante + précédente en parallèle (tendance période/période).
        const [gsc, gscPrev, ga4, ga4Prev] = await Promise.all([
          getSearchConsoleSeo({ period, nowIso }),
          getSearchConsoleSeo({ period: prevPeriod, nowIso }),
          getGa4OrganicSeo({ period, nowIso }),
          getGa4OrganicSeo({ period: prevPeriod, nowIso }),
        ])
        const technical = auditTechnicalSeo({ nowIso, baseUrl: PUBLIC_BASE_URL })

        const overview = buildSeoOverview({
          gsc,
          ga4,
          nowIso,
          prevTotals: gscPrev.status.state === 'PASS' ? gscPrev.totals : null,
          prevOrganic: ga4Prev.status.state === 'PASS' ? ga4Prev.organic : null,
        })

        // 5A : pages annotées par hôte/portée (les sitemaps le sont déjà via la
        // normalisation GSC). L'annotation est INDÉPENDANTE de la portée
        // sélectionnée (chaque objet porte SA propre portée) → cache réutilisable.
        const pages = annotatePagesScope(gsc.pages)
        const sitemaps = gsc.sitemaps
        const opportunities = annotateOpportunitiesScope(
          detectOpportunities({
            queries: gsc.queries,
            pages: gsc.pages,
            indexation: gsc.indexation,
            sitemaps,
            technical,
          }),
          sitemaps,
        )

        return {
          generatedAt: nowIso,
          period,
          gsc: gsc.status,
          ga4: ga4.status,
          overview,
          queries: gsc.queries,
          pages,
          indexation: gsc.indexation,
          sitemaps,
          technical,
          organic: ga4.organic,
          opportunities,
        }
      },
    )

    // La portée sélectionnée est ajoutée HORS cache (le payload caché reste
    // indépendant de la portée : filtrage/étiquetage se font côté présentation).
    return NextResponse.json({ ...payload, scope: selectedScope })
  } catch {
    // Fail-safe honnête : payload vide + connecteurs NOT_CONFIGURED, jamais de faux réel.
    const gsc = notConfigured('google_search_console', nowIso, 'Lecture SEO indisponible.')
    const ga4 = notConfigured('google_analytics', nowIso, 'Lecture SEO indisponible.')
    const empty: SeoIntelligencePayload = {
      generatedAt: nowIso,
      period,
      gsc,
      ga4,
      overview: buildSeoOverview({
        gsc: { status: gsc, totals: null, queries: [], pages: [], indexation: [], sitemaps: [] },
        ga4: { status: ga4, organic: null },
        nowIso,
      }),
      queries: [],
      pages: [],
      indexation: [],
      sitemaps: [],
      technical: null,
      organic: null,
      opportunities: [],
    }
    return NextResponse.json({ ...empty, error: 'read_failed', scope: selectedScope }, { status: 200 })
  }
}

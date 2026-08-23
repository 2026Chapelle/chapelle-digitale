'use client'

/**
 * CITADELLE INTELLIGENCE HUB — SEO · Onglet cockpit (client)
 *
 * Récupère /api/intelligence/seo?period=… et rend six sections :
 * VUE D'ENSEMBLE · OPPORTUNITÉS · REQUÊTES · PAGES · INDEXATION · TECHNIQUE.
 *
 * Honnêteté : un connecteur non configuré n'affiche JAMAIS un nombre déguisé en
 * réel — les cartes montrent « Non configuré / Indisponible » et une invite de
 * configuration explicite. Search Console est toujours « Différé (SEO) ».
 * Style aligné sur le cockpit (card-royal / card-cinematic / section-label /
 * text-pearl / text-cinematic-gold). Responsable des débordements : tables
 * larges enveloppées dans overflow-x-auto.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Minus,
  RefreshCw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import {
  classifyUrl,
  DEFAULT_SEO_SCOPE,
  extractHost,
  matchesScope,
  SEO_SCOPE_LABEL_FR,
  SEO_SCOPE_OPTIONS,
  type SeoScope,
} from '@/lib/intelligence/seo/scope'
import { AVAILABILITY_HINT_FR, rendersRealNumber } from '@/lib/intelligence/availability'
import { formatMetric, type MetricUnitFmt } from '@/lib/intelligence/format'
import type {
  GscPageRow,
  GscQueryRow,
  SeoAvailability,
  SeoConnectorStatus,
  SeoIntelligencePayload,
  SeoOpportunity,
  SeoOverviewCard,
  SeoPeriodKey,
  SeoSeverity,
  SeoTrend,
  SitemapInfo,
  UrlInspectionResult,
} from '@/lib/intelligence/seo/types'

type Payload = SeoIntelligencePayload & { error?: string; scope?: SeoScope }

const PERIODS: ReadonlyArray<{ key: SeoPeriodKey; label: string }> = [
  { key: '7d', label: '7 j' },
  { key: '28d', label: '28 j' },
  { key: '90d', label: '90 j' },
]

const SOURCE_LABEL: Record<string, string> = {
  google_search_console: 'Search Console',
  google_analytics: 'GA4',
}

const SEVERITY_META: Record<SeoSeverity, { label: string; color: string }> = {
  critical: { label: 'Critique', color: '#f87171' },
  high: { label: 'Élevé', color: '#fb923c' },
  medium: { label: 'Moyen', color: '#fbbf24' },
  low: { label: 'Faible', color: '#60a5fa' },
  info: { label: 'Info', color: '#4ade80' },
}

/* --------------------------- Formatage pur --------------------------- */

const nf = new Intl.NumberFormat('fr-FR')

/** Unité de formatage (format.ts) déduite d'une carte de vue d'ensemble. */
function cardUnitFmt(card: SeoOverviewCard): MetricUnitFmt {
  if (card.key === 'position') return 'position'
  if (card.unit === 'ratio') return 'percent01'
  return 'count'
}
/** Valeur d'une carte via format.ts : « — » dès que la dispo n'est pas `real`. */
const fmtCard = (card: SeoOverviewCard): string =>
  formatMetric(card.value, card.availability, cardUnitFmt(card))
const fmtPct = (ratio: number) => `${(ratio * 100).toFixed(2)} %`
const fmtPos = (pos: number) => pos.toFixed(1)
const availLabel: Record<SeoAvailability, string> = {
  real: 'Réel',
  demo: 'Démo',
  unavailable: 'Indisponible',
  no_data: 'Aucune donnée',
  not_applicable: 'Non applicable',
}
/** Sous-texte affiché sous une carte quand la valeur n'est pas réelle. */
const NON_REAL_LABEL: Record<SeoAvailability, string> = {
  real: '',
  demo: 'Donnée de démonstration',
  unavailable: 'Non configuré',
  no_data: 'Aucune donnée sur cette période',
  not_applicable: 'Non applicable',
}

/* --------------------------- Portée (host/scope) --------------------------- */

/** Libellés courts pour les puces de portée (le libellé long sert ailleurs). */
const SCOPE_SHORT: Record<SeoScope, string> = {
  citadelle: 'Citadelle',
  institutional: 'Institutionnel',
  global: 'Global',
  external_or_unknown: 'Externe',
}
const SCOPE_COLOR: Record<SeoScope, string> = {
  citadelle: '#4ade80',
  institutional: '#fbbf24',
  global: '#60a5fa',
  external_or_unknown: '#9ca3af',
}

/**
 * Un objet de cette portée doit-il rester visible sous le filtre sélectionné ?
 * Le signal INSTITUTIONNEL n'est JAMAIS masqué (il est seulement étiqueté) :
 * on ne cache jamais qu'un problème appartient au site de La Chapelle.
 */
function keepForScope(objectScope: SeoScope, selected: SeoScope): boolean {
  if (selected === 'global') return true
  return matchesScope(objectScope, selected) || objectScope === 'institutional'
}

function ScopeChip({ scope, title }: { scope: SeoScope; title?: string }) {
  const color = SCOPE_COLOR[scope]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{ color, borderColor: `${color}55` }}
      title={title ?? SEO_SCOPE_LABEL_FR[scope]}
    >
      {SCOPE_SHORT[scope]}
    </span>
  )
}

/* --------------------------- Petits composants --------------------------- */

function TrendArrow({ trend, delta }: { trend?: SeoTrend; delta?: number }) {
  if (!trend || trend === 'unknown') return null
  if (trend === 'new')
    return <span className="text-[11px] font-semibold text-emerald-400">Nouveau</span>
  const label = typeof delta === 'number' ? `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(0)} %` : ''
  if (trend === 'up')
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-400">
        <ArrowUpRight className="h-3 w-3" /> {label}
      </span>
    )
  if (trend === 'down')
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-red-400">
        <ArrowDownRight className="h-3 w-3" /> {label}
      </span>
    )
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-pearl/40">
      <Minus className="h-3 w-3" /> {label}
    </span>
  )
}

function ConnectorChip({ status }: { status: SeoConnectorStatus }) {
  const name = SOURCE_LABEL[status.connector] ?? status.connector
  const map = {
    PASS: { label: 'Connecté', color: '#4ade80', Icon: CheckCircle2 },
    NOT_CONFIGURED: { label: 'Non configuré', color: '#9ca3af', Icon: XCircle },
    ERROR: { label: 'Erreur', color: '#f87171', Icon: AlertTriangle },
  }[status.state]
  const Icon = map.Icon
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: `${map.color}55`, color: map.color }}
      title={status.reason ?? undefined}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="font-semibold">{name}</span>
      <span className="text-pearl/45">·</span>
      <span>{map.label}</span>
    </div>
  )
}

function OverviewCard({ card }: { card: SeoOverviewCard }) {
  const real = rendersRealNumber(card.availability)
  return (
    <div className="card-cinematic p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-pearl/55">{card.label}</div>
        <span className="text-[10px] text-pearl/35">{SOURCE_LABEL[card.source] ?? card.source}</span>
      </div>
      {real ? (
        <div className="mt-1 font-cinzel text-2xl font-black text-pearl">{fmtCard(card)}</div>
      ) : (
        <div title={AVAILABILITY_HINT_FR[card.availability]}>
          {/* Jamais un 0 trompeur : « — » + explication (aucune donnée / non configuré). */}
          <div className="mt-1 font-cinzel text-2xl font-black text-pearl/30">{fmtCard(card)}</div>
          <div className="text-[11px] text-pearl/40">
            {NON_REAL_LABEL[card.availability] || availLabel[card.availability]}
          </div>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-[11px] text-pearl/40">{FRESHNESS_LABELS_FR[card.freshness]}</span>
        {real && <TrendArrow trend={card.trend} delta={card.delta} />}
      </div>
    </div>
  )
}

function OpportunityItem({ o }: { o: SeoOpportunity }) {
  const meta = SEVERITY_META[o.severity]
  const scope: SeoScope = o.scope ?? classifyUrl(o.subject)
  const isInstitutional = scope === 'institutional'
  return (
    <div className="card-royal border-l-2 p-4" style={{ borderLeftColor: meta.color }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 font-medium text-pearl">{o.subject}</div>
        <div className="flex items-center gap-2">
          <ScopeChip scope={scope} />
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ color: meta.color, border: `1px solid ${meta.color}55` }}
          >
            {meta.label}
          </span>
        </div>
      </div>
      {isInstitutional && (
        <div className="mt-2 rounded-md border border-amber-500/25 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-200/90">
          {SEO_SCOPE_LABEL_FR.institutional} — impact Citadelle : non démontré.
        </div>
      )}
      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-pearl/45">POURQUOI</dt>
          <dd className="text-pearl/75">{o.why}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-pearl/45">PREUVE</dt>
          <dd className="text-pearl/75">{o.evidence}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-16 shrink-0 font-semibold text-pearl/45">ACTION</dt>
          <dd className="text-cinematic-gold/90">{o.action}</dd>
        </div>
      </dl>
    </div>
  )
}

/* --------------------------- Tables triables --------------------------- */

type QuerySortKey = 'query' | 'clicks' | 'impressions' | 'ctr' | 'position'

function QueriesTable({ rows }: { rows: ReadonlyArray<GscQueryRow> }) {
  const [sortKey, setSortKey] = useState<QuerySortKey>('clicks')
  const [asc, setAsc] = useState(false)
  const [filter, setFilter] = useState('')

  const sorted = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const list = f ? rows.filter((r) => r.query.toLowerCase().includes(f)) : rows.slice()
    list.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return asc ? cmp : -cmp
    })
    return list
  }, [rows, sortKey, asc, filter])

  const th = (key: QuerySortKey, label: string, alignRight = false) => (
    <th
      className={`cursor-pointer py-2 pr-4 font-medium select-none ${alignRight ? 'text-right' : 'text-left'}`}
      onClick={() => (key === sortKey ? setAsc((v) => !v) : (setSortKey(key), setAsc(false)))}
    >
      {label}
      {sortKey === key ? (asc ? ' ▲' : ' ▼') : ''}
    </th>
  )

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer les requêtes…"
        className="mb-3 w-full max-w-xs rounded-lg border border-pearl/15 bg-pearl/5 px-3 py-1.5 text-sm text-pearl placeholder:text-pearl/30 focus:outline-none"
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-xs text-pearl/45">
              {th('query', 'Requête')}
              {th('clicks', 'Clics', true)}
              {th('impressions', 'Impr.', true)}
              {th('ctr', 'CTR', true)}
              {th('position', 'Position', true)}
              <th className="py-2 text-right font-medium">Tendance</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.query} className="border-t border-pearl/10">
                <td className="py-2 pr-4 text-pearl/85">{r.query}</td>
                <td className="py-2 pr-4 text-right text-pearl">{nf.format(r.clicks)}</td>
                <td className="py-2 pr-4 text-right text-pearl/80">{nf.format(r.impressions)}</td>
                <td className="py-2 pr-4 text-right text-pearl/80">{fmtPct(r.ctr)}</td>
                <td className="py-2 pr-4 text-right text-pearl/80">{fmtPos(r.position)}</td>
                <td className="py-2 text-right">
                  <TrendArrow trend={r.trend} delta={r.delta} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function verdictBadge(insp: UrlInspectionResult | undefined): { label: string; color: string } {
  if (!insp) return { label: 'INCONNU', color: '#9ca3af' }
  const cov = (insp.coverageState ?? '').toLowerCase()
  if (insp.googleCanonical && insp.userCanonical) {
    const norm = (u: string) => u.replace(/\/+$/, '')
    if (norm(insp.googleCanonical) !== norm(insp.userCanonical))
      return { label: 'CANONICAL ≠', color: '#fb923c' }
  }
  if ((insp.robotsTxtState ?? '').toLowerCase().includes('disallow'))
    return { label: 'ROBOTS BLOQUÉ', color: '#f87171' }
  if (insp.verdict === 'PASS') return { label: 'INDEXÉE', color: '#4ade80' }
  if (insp.verdict === 'FAIL' || cov.includes('not indexed') || cov.includes('exclu'))
    return { label: 'NON INDEXÉE', color: '#f87171' }
  return { label: 'INCONNU', color: '#9ca3af' }
}

function PagesTable({
  rows,
  indexation,
}: {
  rows: ReadonlyArray<GscPageRow>
  indexation: ReadonlyArray<UrlInspectionResult>
}) {
  const byPath = useMemo(() => {
    const m = new Map<string, UrlInspectionResult>()
    for (const i of indexation) {
      try {
        m.set(new URL(i.url).pathname.replace(/\/+$/, '') || '/', i)
      } catch {
        m.set(i.url, i)
      }
    }
    return m
  }, [indexation])

  const pathOf = (page: string) => {
    try {
      return new URL(page).pathname.replace(/\/+$/, '') || '/'
    } catch {
      return page
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="text-left text-xs text-pearl/45">
            <th className="py-2 pr-4 font-medium">Page</th>
            <th className="py-2 pr-4 font-medium">Portée</th>
            <th className="py-2 pr-4 font-medium text-right">Clics</th>
            <th className="py-2 pr-4 font-medium text-right">Impr.</th>
            <th className="py-2 pr-4 font-medium text-right">CTR</th>
            <th className="py-2 pr-4 font-medium text-right">Position</th>
            <th className="py-2 pr-4 font-medium">Index</th>
            <th className="py-2 font-medium text-right">Tendance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const badge = verdictBadge(byPath.get(pathOf(r.page)))
            const host = extractHost(r.page)
            const scope = classifyUrl(r.page)
            return (
              <tr key={r.page} className="border-t border-pearl/10">
                <td className="py-2 pr-4 text-pearl/85" title={host ?? undefined}>
                  {pathOf(r.page)}
                </td>
                <td className="py-2 pr-4">
                  <ScopeChip scope={scope} title={host ?? SEO_SCOPE_LABEL_FR[scope]} />
                </td>
                <td className="py-2 pr-4 text-right text-pearl">{nf.format(r.clicks)}</td>
                <td className="py-2 pr-4 text-right text-pearl/80">{nf.format(r.impressions)}</td>
                <td className="py-2 pr-4 text-right text-pearl/80">{fmtPct(r.ctr)}</td>
                <td className="py-2 pr-4 text-right text-pearl/80">{fmtPos(r.position)}</td>
                <td className="py-2 pr-4">
                  <span className="text-[11px] font-semibold" style={{ color: badge.color }}>
                    {badge.label}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <TrendArrow trend={r.trend} delta={r.delta} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const CHECK_COLOR: Record<string, string> = {
  PASS: '#4ade80',
  WARN: '#fbbf24',
  FAIL: '#f87171',
  NA: '#9ca3af',
}
function CheckBadge({ status }: { status: string }) {
  return (
    <span className="text-[11px] font-semibold" style={{ color: CHECK_COLOR[status] ?? '#9ca3af' }}>
      {status}
    </span>
  )
}

function SitemapRow({ s }: { s: SitemapInfo }) {
  const scope: SeoScope = s.scope ?? classifyUrl(s.path)
  const host = s.host ?? extractHost(s.path) ?? undefined
  const errors = s.errors ?? 0
  const hasIssue = errors > 0 || Boolean(s.isPending)
  const isInstitutional = scope === 'institutional'
  return (
    <div className="rounded-md border border-pearl/10 p-2">
      <div className="flex flex-wrap items-center gap-2">
        <ScopeChip scope={scope} title={host ?? SEO_SCOPE_LABEL_FR[scope]} />
        <span className="break-all text-pearl/85">{s.path}</span>
        <span className="text-[11px] text-pearl/40">
          {errors} erreur(s) · {s.warnings ?? 0} avert.
          {s.isPending ? ' · en attente' : ''}
        </span>
      </div>
      {isInstitutional && (
        <div className="mt-1 text-[11px] text-amber-200/80">
          {SEO_SCOPE_LABEL_FR.institutional}
          {hasIssue ? ' — impact Citadelle : non démontré.' : '.'}
        </div>
      )}
    </div>
  )
}

/* --------------------------- Onglet principal --------------------------- */

export default function SeoTab() {
  const [period, setPeriod] = useState<SeoPeriodKey>('28d')
  // Portée par défaut : Citadelle (destination numérique prioritaire).
  const [scope, setScope] = useState<SeoScope>(DEFAULT_SEO_SCOPE)
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (key: SeoPeriodKey, sc: SeoScope) => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch(`/api/intelligence/seo?period=${key}&scope=${sc}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData((await res.json()) as Payload)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(period, scope)
  }, [period, scope, load])

  const gscConfigured = data?.gsc.state === 'PASS'
  const ga4Configured = data?.ga4.state === 'PASS'
  const bothOff = data && !gscConfigured && !ga4Configured

  // Filtrage présentation par portée. Le signal INSTITUTIONNEL n'est jamais
  // masqué : il reste affiché et clairement étiqueté (jamais rangé « Citadelle »).
  const visiblePages = useMemo(
    () => (data ? data.pages.filter((p) => keepForScope(classifyUrl(p.page), scope)) : []),
    [data, scope],
  )
  const visibleOpportunities = useMemo(
    () =>
      data
        ? data.opportunities.filter((o) => keepForScope(o.scope ?? classifyUrl(o.subject), scope))
        : [],
    [data, scope],
  )

  return (
    <div className="mb-8">
      {/* Barre de contrôle : période + actualiser + statut connecteurs */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="section-label">SEO — Google Intelligence</div>
        <div className="inline-flex rounded-lg bg-pearl/5 p-0.5 text-xs">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={
                'rounded-md px-3 py-1 font-medium transition ' +
                (period === p.key ? 'bg-cinematic-gold/15 text-cinematic-gold' : 'text-pearl/55 hover:text-pearl')
              }
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* Sélecteur de PORTÉE : la propriété GSC est un domaine multi-hôtes ;
            on classe par hôte réel. Défaut = Citadelle. */}
        <div className="inline-flex rounded-lg bg-pearl/5 p-0.5 text-xs">
          {SEO_SCOPE_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              title={SEO_SCOPE_LABEL_FR[s]}
              className={
                'rounded-md px-3 py-1 font-medium transition ' +
                (scope === s ? 'bg-cinematic-gold/15 text-cinematic-gold' : 'text-pearl/55 hover:text-pearl')
              }
            >
              {SCOPE_SHORT[s]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load(period, scope)}
          className="inline-flex items-center gap-2 rounded-lg bg-pearl/5 px-3 py-1.5 text-sm text-pearl/70 hover:text-pearl"
        >
          <RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')} /> Actualiser
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {data && <ConnectorChip status={data.gsc} />}
          {data && <ConnectorChip status={data.ga4} />}
        </div>
        {data?.period && (
          <span className="text-[11px] text-pearl/35">
            Période {data.period.from} → {data.period.to}
            {data.gsc.checkedAt && (
              <> · maj {new Date(data.gsc.checkedAt).toLocaleTimeString('fr-FR')}</>
            )}
          </span>
        )}
      </div>

      <p className="mb-4 text-[11px] text-pearl/35">
        Portée « {SEO_SCOPE_LABEL_FR[scope]} ». La propriété Search Console est un domaine couvrant
        plusieurs hôtes : chaque signal est classé par <strong className="text-pearl/55">hôte réel</strong>,
        jamais supposé « Citadelle ». Les signaux institutionnels (site de La Chapelle) restent affichés et
        clairement étiquetés.
      </p>

      {err && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {data?.error && !err && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300">
          Lecture SEO indisponible : sources non configurées. Aucune donnée fabriquée n’est affichée.
        </div>
      )}

      {!data && !err ? (
        <div className="card-royal p-10 text-center text-sm text-pearl/40">Chargement…</div>
      ) : data ? (
        <div className="space-y-8">
          {/* Invite de configuration (aucun connecteur Google branché) */}
          {bothOff && (
            <div className="card-royal border-l-2 p-4" style={{ borderLeftColor: '#fbbf24' }}>
              <div className="flex items-center gap-2 text-pearl">
                <Search className="h-4 w-4 text-cinematic-gold" />
                <span className="font-medium">Connecteurs Google non configurés</span>
              </div>
              <p className="mt-2 text-sm text-pearl/60">
                Aucune donnée Search Console / GA4 n’est disponible. Les valeurs restent{' '}
                <em>Non configuré</em> — jamais estimées. Pour activer le cockpit, renseignez le compte de
                service Google (Search Console API + GA4 Data API) côté serveur, puis autorisez la propriété
                dans Search Console.
              </p>
              <div className="mt-2 text-[11px] text-pearl/40">
                Voir la documentation de mise en place SEO (variables d’environnement serveur : credentials du
                compte de service, siteUrl GSC, GA_PROPERTY_ID). Aucun secret n’est exposé côté client.
              </div>
            </div>
          )}

          {/* 1. VUE D'ENSEMBLE */}
          <section>
            <div className="section-label mb-3">Vue d’ensemble</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.overview.map((c) => (
                <OverviewCard key={c.key} card={c} />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-pearl/35">
              Position moyenne : plus la valeur est <strong className="text-pearl/55">basse</strong>, meilleur
              est le classement. Search Console = <strong className="text-pearl/55">Différé (SEO)</strong> (J-2).
            </p>
          </section>

          {/* 2. OPPORTUNITÉS */}
          <section>
            <div className="section-label mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cinematic-gold" /> Opportunités
              <span className="text-[11px] font-normal text-pearl/35">({visibleOpportunities.length})</span>
            </div>
            {visibleOpportunities.length === 0 ? (
              <div className="card-royal p-6 text-center text-sm text-pearl/40">
                {gscConfigured || data.technical
                  ? 'Aucune opportunité détectée pour cette portée sur cette période.'
                  : 'Opportunités indisponibles tant que les connecteurs ne sont pas configurés.'}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {visibleOpportunities.map((o, i) => (
                  <OpportunityItem key={`${o.kind}:${o.subject}:${i}`} o={o} />
                ))}
              </div>
            )}
          </section>

          {/* 3. REQUÊTES */}
          <section>
            <div className="section-label mb-3">Requêtes</div>
            <div className="card-royal p-4">
              {!gscConfigured ? (
                <div className="py-6 text-center text-sm text-pearl/40">
                  Search Console non configuré — aucune requête à afficher.
                </div>
              ) : data.queries.length === 0 ? (
                <div className="py-6 text-center text-sm text-pearl/40">
                  Aucune requête sur cette période.
                </div>
              ) : (
                <QueriesTable rows={data.queries} />
              )}
            </div>
          </section>

          {/* 4. PAGES */}
          <section>
            <div className="section-label mb-3">Pages</div>
            <div className="card-royal p-4">
              {!gscConfigured ? (
                <div className="py-6 text-center text-sm text-pearl/40">
                  Search Console non configuré — aucune page à afficher.
                </div>
              ) : visiblePages.length === 0 ? (
                <div className="py-6 text-center text-sm text-pearl/40">
                  Aucune page pour cette portée sur cette période.
                </div>
              ) : (
                <PagesTable rows={visiblePages} indexation={data.indexation} />
              )}
            </div>
          </section>

          {/* 5. INDEXATION */}
          <section>
            <div className="section-label mb-3">Indexation — pages importantes</div>
            <div className="card-royal p-4">
              {data.indexation.length === 0 ? (
                <div className="py-6 text-center text-sm text-pearl/40">
                  {gscConfigured
                    ? 'Aucun résultat d’inspection d’URL disponible.'
                    : 'Inspection d’URL indisponible (Search Console non configuré).'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="text-left text-xs text-pearl/45">
                        <th className="py-2 pr-4 font-medium">URL</th>
                        <th className="py-2 pr-4 font-medium">État</th>
                        <th className="py-2 pr-4 font-medium">Couverture</th>
                        <th className="py-2 font-medium">Dernier crawl</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.indexation.map((i) => {
                        const badge = verdictBadge(i)
                        let path = i.url
                        try {
                          path = new URL(i.url).pathname.replace(/\/+$/, '') || '/'
                        } catch {
                          /* garde l'URL brute */
                        }
                        return (
                          <tr key={i.url} className="border-t border-pearl/10">
                            <td className="py-2 pr-4 text-pearl/85">
                              <a
                                href={i.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 hover:text-cinematic-gold"
                              >
                                {path} <ExternalLink className="h-3 w-3 opacity-40" />
                              </a>
                            </td>
                            <td className="py-2 pr-4">
                              <span className="text-[11px] font-semibold" style={{ color: badge.color }}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-pearl/60">{i.coverageState ?? '—'}</td>
                            <td className="py-2 text-pearl/50">
                              {i.lastCrawlTime
                                ? new Date(i.lastCrawlTime).toLocaleDateString('fr-FR')
                                : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* 6. TECHNIQUE */}
          <section>
            <div className="section-label mb-3">Technique on-page</div>
            {!data.technical ? (
              <div className="card-royal p-6 text-center text-sm text-pearl/40">
                Audit technique indisponible.
              </div>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {(
                    [
                      ['metadata', 'Métadonnées'],
                      ['canonicals', 'Canonicals'],
                      ['robots', 'Robots'],
                      ['sitemap', 'Sitemap'],
                      ['jsonLd', 'JSON-LD'],
                      ['privateRoutesNoindex', 'Routes privées noindex'],
                    ] as const
                  ).map(([k, label]) => (
                    <div key={k} className="card-cinematic p-3">
                      <div className="text-[11px] text-pearl/55">{label}</div>
                      <div className="mt-1">
                        <CheckBadge status={data.technical!.checks[k]} />
                      </div>
                    </div>
                  ))}
                </div>

                {data.sitemaps.length > 0 && (
                  <div className="card-royal mb-3 p-4">
                    <div className="mb-2 text-xs text-pearl/55">
                      Sitemaps
                      <span className="ml-2 font-normal text-pearl/35">
                        (classés par hôte réel — jamais tous « Citadelle »)
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      {data.sitemaps.map((s) => (
                        <SitemapRow key={s.path} s={s} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="card-royal p-4">
                  {data.technical.routes.length === 0 ? (
                    <div className="py-4 text-center text-sm text-pearl/40">
                      Matrice de routes non renseignée (audit technique en attente).
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-sm">
                        <thead>
                          <tr className="text-left text-xs text-pearl/45">
                            <th className="py-2 pr-4 font-medium">Route</th>
                            <th className="py-2 pr-4 font-medium">Title</th>
                            <th className="py-2 pr-4 font-medium">Desc.</th>
                            <th className="py-2 pr-4 font-medium">Canon.</th>
                            <th className="py-2 pr-4 font-medium">JSON-LD</th>
                            <th className="py-2 pr-4 font-medium">Sitemap</th>
                            <th className="py-2 font-medium">Problèmes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.technical.routes.map((r) => (
                            <tr key={r.route} className="border-t border-pearl/10 align-top">
                              <td className="py-2 pr-4 text-pearl/85">{r.route}</td>
                              <td className="py-2 pr-4"><CheckBadge status={r.title} /></td>
                              <td className="py-2 pr-4"><CheckBadge status={r.description} /></td>
                              <td className="py-2 pr-4"><CheckBadge status={r.canonical} /></td>
                              <td className="py-2 pr-4"><CheckBadge status={r.structuredData} /></td>
                              <td className="py-2 pr-4 text-pearl/60">{r.inSitemap ? 'oui' : 'non'}</td>
                              <td className="py-2 text-[11px] text-pearl/50">
                                {r.issues.length > 0 ? r.issues.join(' · ') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  )
}

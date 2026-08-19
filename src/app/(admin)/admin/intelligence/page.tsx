'use client'

/**
 * CITADELLE INTELLIGENCE HUB — Shell de fondation (Phase 0)
 * Route : /admin/intelligence  (protégée par middleware + admin-auth, comme toute page /admin)
 *
 * PRINCIPE : DATA BEFORE DECORATION. Ce shell n'affiche AUCUN chiffre de production.
 * Il expose le CONTRAT réel (couverture des événements, fraîcheur, connecteurs) et
 * signale explicitement l'état "prototype / données de démonstration".
 *
 * NON câblé dans la navigation admin globale (zone protégée en Phase 0) : accessible
 * par URL directe. Le câblage nav est différé à HUB-1.
 */

import { useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Facebook,
  Gauge,
  Layers,
  MessageCircle,
  MousePointerClick,
  Radio,
  Search,
  Youtube,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  coverageSummary,
  eventsByAvailability,
} from '@/lib/intelligence/core/event-contract'
import { DEMO_BADGE_FR } from '@/lib/intelligence/core/demo'
import {
  FRESHNESS_LABELS_FR,
  FRESHNESS_LEVELS,
} from '@/lib/intelligence/types/freshness'
import { CONNECTOR_DESCRIPTORS } from '@/lib/intelligence/connectors/registry'
import type { ConnectorId } from '@/lib/intelligence/connectors/types'

const TABS = [
  { id: 'apercu', label: "Vue générale", icon: Gauge },
  { id: 'temps-reel', label: 'Temps réel', icon: Activity },
  { id: 'acquisition', label: 'Acquisition', icon: MousePointerClick },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'contenus', label: 'Contenus', icon: Layers },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'conversions', label: 'Conversions', icon: BarChart3 },
] as const

const AVAIL_LABEL: Record<'available' | 'partial' | 'gap', string> = {
  available: 'Disponible',
  partial: 'Partiel',
  gap: 'À instrumenter',
}
const AVAIL_COLOR: Record<'available' | 'partial' | 'gap', string> = {
  available: '#4ade80',
  partial: '#fbbf24',
  gap: '#f87171',
}

export default function IntelligenceHubPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('apercu')
  const coverage = useMemo(() => coverageSummary(), [])
  const connectorIds = Object.keys(CONNECTOR_DESCRIPTORS) as ConnectorId[]

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <PageHeader
          eyebrow="Administration"
          title={
            <>
              Intelligence <span className="text-cinematic-gold">&amp; Acquisition</span>
            </>
          }
          description="Cockpit SEO · Audience · Acquisition · Contenu · Conversion. Fondation (Phase 0) — contrats de données, pas encore de mesures de production."
          actions={
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: '#fbbf24', color: '#fbbf24' }}
            >
              <Radio className="h-3.5 w-3.5" /> {DEMO_BADGE_FR}
            </span>
          }
        />

        {/* Bandeau d'honnêteté : aucun chiffre de production ici. */}
        <div
          className="card-royal mb-8 border-l-2 p-4 text-sm text-pearl/70"
          style={{ borderLeftColor: '#fbbf24' }}
        >
          <strong className="text-pearl">Prototype de fondation.</strong> Cette page
          présente le <em>contrat</em> réel du Hub (événements canoniques, fraîcheur,
          connecteurs). Aucune valeur affichée ne provient de la production : les
          connecteurs externes ne sont pas branchés en Phase 0.
        </div>

        {/* Onglets (placeholders visuels — pas de données) */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = t.id === tab
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ' +
                  (active
                    ? 'bg-cinematic-gold/15 text-cinematic-gold'
                    : 'text-pearl/55 hover:text-pearl hover:bg-pearl/5')
                }
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Couverture des événements canoniques (donnée RÉELLE du contrat) */}
        <section className="mb-8">
          <div className="section-label mb-3">Couverture des événements first-party</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['available', 'partial', 'gap'] as const).map((k) => (
              <div key={k} className="card-cinematic p-4">
                <div className="text-xs text-pearl/55">{AVAIL_LABEL[k]}</div>
                <div
                  className="font-cinzel text-2xl font-black"
                  style={{ color: AVAIL_COLOR[k] }}
                >
                  {coverage[k]}
                </div>
              </div>
            ))}
            <div className="card-cinematic p-4">
              <div className="text-xs text-pearl/55">Total canonique</div>
              <div className="font-cinzel text-2xl font-black text-pearl">
                {coverage.total}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            {(['available', 'partial', 'gap'] as const).map((k) =>
              eventsByAvailability(k).map((e) => (
                <div
                  key={e.name}
                  className="flex flex-col gap-1 rounded-lg border border-pearl/10 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-mono text-pearl/80">{e.name}</span>
                  <span className="text-xs text-pearl/45">{e.sourceOfTruth}</span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: AVAIL_COLOR[k] }}
                  >
                    {AVAIL_LABEL[k]}
                  </span>
                </div>
              )),
            )}
          </div>
        </section>

        {/* Légende de fraîcheur (contrat) */}
        <section className="mb-8">
          <div className="section-label mb-3">Niveaux de fraîcheur</div>
          <div className="flex flex-wrap gap-2">
            {FRESHNESS_LEVELS.map((f) => (
              <span
                key={f}
                className="rounded-full border border-pearl/15 px-3 py-1 text-xs text-pearl/70"
              >
                {FRESHNESS_LABELS_FR[f]}
              </span>
            ))}
          </div>
        </section>

        {/* État des connecteurs (tous non branchés en Phase 0) */}
        <section>
          <div className="section-label mb-3">Connecteurs</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connectorIds.map((id) => {
              const d = CONNECTOR_DESCRIPTORS[id]
              return (
                <div key={id} className="card-royal p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-pearl">{d.displayName}</span>
                    <span className="rounded-full border border-pearl/20 px-2 py-0.5 text-[11px] text-pearl/50">
                      Non connecté
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-pearl/45">
                    Fraîcheur : {FRESHNESS_LABELS_FR[d.freshness]} · Lecture seule
                    {d.requiresAuth ? ' · Auth requise (phase ultérieure)' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

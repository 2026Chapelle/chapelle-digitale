'use client'
/**
 * HUB-4 — Légende des niveaux de FRAÎCHEUR des données.
 * Explique honnêtement pourquoi une métrique SEO n'est jamais « temps réel ».
 * Les libellés proviennent du contrat partagé (FRESHNESS_LABELS_FR) — jamais codés en dur.
 */
import { Zap, Activity, RefreshCw, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  FRESHNESS_LEVELS,
  FRESHNESS_LABELS_FR,
  type Freshness,
} from '@/lib/intelligence/types/freshness'

const FRESHNESS_META: Record<Freshness, { icon: LucideIcon; color: string; explain: string }> = {
  REALTIME: {
    icon: Zap,
    color: '#4ade80',
    explain: 'Instantané (heartbeat, événements first-party).',
  },
  NEAR_REALTIME: {
    icon: Activity,
    color: '#34d399',
    explain: 'Quelques secondes de délai (caches courts, attribution).',
  },
  SYNCED: {
    icon: RefreshCw,
    color: '#fbbf24',
    explain: 'Rafraîchi par lots / cron (agrégations, GA4, Meta).',
  },
  SEO_DELAYED: {
    icon: Clock,
    color: '#9ca3af',
    explain: 'Délai externe important (Search Console J-2/J-3, stats YouTube).',
  },
}

export default function FreshnessLegend() {
  return (
    <div className="card-royal p-4">
      <div className="section-label mb-3">Niveaux de fraîcheur</div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FRESHNESS_LEVELS.map((level) => {
          const meta = FRESHNESS_META[level]
          const Icon = meta.icon
          return (
            <li key={level} className="flex items-start gap-2.5">
              <Icon
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: meta.color }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-sm text-pearl font-medium">
                  {FRESHNESS_LABELS_FR[level]}
                </div>
                <div className="text-xs text-pearl/50 leading-snug">{meta.explain}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

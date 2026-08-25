'use client'

import { useState } from 'react'
import React from 'react'

export type EditorialWorkspaceView = 'today' | 'calendar' | 'opportunities'

export type EditorialWorkspaceItem = {
  id: string
  title: string
  recommendationKind?: 'CREATE' | 'REPURPOSE' | 'PROMOTE'
  contentKind?: string
  targetChannel?: string
  priorityBand?: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  status?: string
  scheduledFor?: string | null
  windowStart?: string
  windowEnd?: string
  sourceTitle?: string | null
  sourceContentId?: string | null
  sourceContentType?: string | null
  signals?: ReadonlyArray<Record<string, unknown>>
  why?: ReadonlyArray<string>
  notes?: string | null
  batchId?: string | null
  parentRecommendationId?: string | null
}

export type EditorialWorkspaceSummary = {
  priorities: EditorialWorkspaceItem[]
  weeklyRecommendations: EditorialWorkspaceItem[]
  watchlist: EditorialWorkspaceItem[]
}

type Props = {
  organizationId: string
  activeView: EditorialWorkspaceView
  summary: EditorialWorkspaceSummary
  canWrite?: boolean
  onRefresh?: () => void
  onPrepareWeek?: () => void
}

const views: Array<{ id: EditorialWorkspaceView; label: string }> = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'opportunities', label: 'Opportunités' },
]

export function EditorialWorkspaceShell({
  organizationId,
  activeView,
  summary,
  canWrite = false,
  onRefresh,
  onPrepareWeek,
}: Props) {
  const [view, setView] = useState(activeView)

  return (
    <section aria-label="Intelligence éditoriale" data-organization-id={organizationId} className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-pearl/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="section-label">Copilote éditorial</div>
          <h1 className="mt-1 font-cinzel text-2xl font-black text-pearl sm:text-3xl">Que publier maintenant&nbsp;?</h1>
          <p className="mt-2 max-w-2xl text-sm text-pearl/55">
            Des recommandations explicables, ancrées dans les contenus et les données disponibles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onRefresh} disabled={!canWrite} className="rounded-lg border border-pearl/10 bg-pearl/5 px-3 py-2 text-sm text-pearl/75 hover:text-pearl disabled:cursor-not-allowed disabled:opacity-40">
            Actualiser maintenant
          </button>
          <button type="button" onClick={onPrepareWeek} disabled={!canWrite} className="rounded-lg bg-cinematic-gold px-3 py-2 text-sm font-semibold text-black hover:bg-cinematic-gold/90 disabled:cursor-not-allowed disabled:opacity-40">
            Préparer ma semaine
          </button>
        </div>
      </div>

      <nav aria-label="Vues éditoriales" className="flex flex-wrap gap-2">
        {views.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => setView(item.id)}
            className={'rounded-lg px-3 py-2 text-sm font-medium transition ' + (view === item.id ? 'bg-cinematic-gold/15 text-cinematic-gold' : 'text-pearl/55 hover:bg-pearl/5 hover:text-pearl')}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="card-royal p-5 text-sm text-pearl/60">
        <div className="font-medium text-pearl/85">{view === 'today' ? 'Aujourd’hui' : view === 'calendar' ? 'Calendrier' : 'Opportunités'}</div>
        <div className="mt-2 text-pearl/50">{summary.priorities.length} priorité(s), {summary.weeklyRecommendations.length} recommandation(s) cette semaine.</div>
      </div>
    </section>
  )
}

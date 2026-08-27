'use client'

import { useState } from 'react'
import React from 'react'
import { TodayView } from './TodayView'
import { CalendarView } from './CalendarView'
import { OpportunitiesView } from './OpportunitiesView'
import { formatEditorialAction, formatEditorialChannel, formatEditorialFamily } from '@/lib/intelligence/editorial/workspace-planning'

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
  suggestedFor?: string
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
  opportunities: EditorialWorkspaceItem[]
  calendarRecommendations: EditorialWorkspaceItem[]
  totalOpportunities: number
  weeklyCapacity: number
  watchlist: EditorialWorkspaceItem[]
}

type Props = {
  organizationId: string
  activeView: EditorialWorkspaceView
  summary: EditorialWorkspaceSummary
  canWrite?: boolean
  onRefresh?: () => void
  onPrepareWeek?: () => void
  onAction?: (id: string, action: 'ACCEPTED' | 'SCHEDULED' | 'REJECTED' | 'MODIFY') => void
  onCalendarSave?: (id: string, values: { date: string; channel: string; notes: string }) => void
}

const views: Array<{ id: EditorialWorkspaceView; label: string }> = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'calendar', label: 'Calendrier' },
  { id: 'opportunities', label: 'Opportunités' },
]

export const weekPreviewAcceptClasses = 'border border-[#D4AF37] bg-[#D4AF37] text-[#050505] shadow-[0_0_18px_rgba(212,175,55,0.28)] hover:bg-[#F5E6A7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] disabled:cursor-not-allowed disabled:border-gold/50 disabled:bg-gold/15 disabled:text-gold-light disabled:opacity-100'

export function EditorialWorkspaceShell({
  organizationId,
  activeView,
  summary,
  canWrite = false,
  onRefresh,
  onPrepareWeek,
  onAction,
  onCalendarSave,
}: Props) {
  const [view, setView] = useState(activeView)
  const [weekPreview, setWeekPreview] = useState(false)
  const handlePrepareWeek = () => {
    setWeekPreview(true)
    onPrepareWeek?.()
  }

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

      {view === 'today' ? (
        <TodayView priorities={summary.priorities} weeklyRecommendations={summary.weeklyRecommendations} totalOpportunities={summary.totalOpportunities} weeklyCapacity={summary.weeklyCapacity} watchlist={summary.watchlist} canWrite={canWrite} onPrepareWeek={handlePrepareWeek} onAction={onAction} />
      ) : view === 'calendar' ? (
        <CalendarView
          window={{ start: new Date().toISOString().slice(0, 10), end: new Date(Date.now() + 29 * 86400000).toISOString().slice(0, 10) }}
          items={summary.calendarRecommendations.map((item) => ({ id: item.id, title: item.title, status: item.status ?? 'PROPOSED', channel: formatEditorialChannel(item.targetChannel), date: item.scheduledFor ?? item.windowStart ?? new Date().toISOString().slice(0, 10), notes: item.notes, batchId: item.batchId, parentRecommendationId: item.parentRecommendationId }))}
          canWrite={canWrite}
          onSave={onCalendarSave}
        />
      ) : (
        <OpportunitiesView
          filters={['Créer', 'Décliner', 'Promouvoir', 'SEO', 'sous-exploité', 'à surveiller']}
          opportunities={summary.opportunities.map((item) => ({ id: item.id, title: item.title, family: formatEditorialFamily(item.recommendationKind), status: item.priorityBand, tags: item.priorityBand === 'A_SURVEILLER' ? ['à surveiller'] : undefined }))}
          connectorStates={[]}
          canWrite={canWrite}
        />
      )}
      {weekPreview && (
        <section aria-label="Aperçu de ma semaine" className="card-royal mt-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="section-label">Aperçu · 7 jours</div><h2 className="mt-1 font-cinzel text-xl font-bold text-pearl">Préparer ma semaine</h2><p className="mt-1 text-sm text-pearl/55">Aucune publication ni acceptation automatique. Chaque ligne reste une décision humaine.</p></div>
            <button type="button" onClick={() => setWeekPreview(false)} className="rounded-md border border-pearl/10 px-2.5 py-1.5 text-xs text-pearl/65">Fermer</button>
          </div>
          {summary.weeklyRecommendations.length === 0 ? <div className="mt-4 text-sm text-pearl/50">Aucune opportunité compatible avec la capacité actuelle.</div> : <>
            <div className="mt-4 space-y-2">{summary.weeklyRecommendations.slice(0, 5).map((item) => <div key={item.id} className="flex flex-col gap-2 border-t border-pearl/10 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm text-pearl/85">{item.title}</div><div className="text-xs text-pearl/45">{formatEditorialAction(item)} · {item.status === 'PROPOSED' ? `Suggéré le ${item.suggestedFor ?? 'date à définir'}` : `Prévu le ${item.scheduledFor ?? item.windowStart ?? 'date à définir'}`}</div></div><button type="button" disabled={!canWrite} onClick={() => onAction?.(item.id, 'ACCEPTED')} className={`${weekPreviewAcceptClasses} rounded-md px-2.5 py-1.5 text-xs`}>Accepter cet élément</button></div>)}</div>
            <button type="button" disabled={!canWrite} onClick={() => summary.weeklyRecommendations.slice(0, 5).forEach((item) => onAction?.(item.id, 'ACCEPTED'))} className={`${weekPreviewAcceptClasses} mt-3 rounded-lg px-3 py-2 text-xs font-semibold`}>Accepter les éléments proposés</button>
          </>}
        </section>
      )}
    </section>
  )
}

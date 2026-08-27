'use client'

import React from 'react'
import { RecommendationActionBar } from './RecommendationActionBar'
import { WhyDrawer, type EditorialEvidence } from './WhyDrawer'
import { formatEditorialAction } from '@/lib/intelligence/editorial/workspace-planning'

export type TodayRecommendation = {
  id: string
  title: string
  band?: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  priorityBand?: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  recommendationKind?: 'CREATE' | 'REPURPOSE' | 'PROMOTE'
  contentKind?: string
  targetChannel?: string
  status?: string
  scheduledFor?: string | null
  suggestedFor?: string
  why?: ReadonlyArray<string>
  evidence?: EditorialEvidence[]
  signals?: ReadonlyArray<Record<string, unknown>>
}

type Props = {
  priorities: TodayRecommendation[]
  weeklyRecommendations?: TodayRecommendation[]
  totalOpportunities?: number
  weeklyCapacity?: number
  watchlist: TodayRecommendation[]
  canWrite?: boolean
  onPrepareWeek: () => void
  onAction?: (id: string, action: 'ACCEPTED' | 'SCHEDULED' | 'REJECTED' | 'MODIFY') => void
}

const bandLabel: Record<NonNullable<TodayRecommendation['band']>, string> = {
  FORTE: 'PRIORITÉ FORTE',
  NORMALE: 'PRIORITÉ NORMALE',
  A_SURVEILLER: 'À SURVEILLER',
}

export function TodayView({ priorities, weeklyRecommendations = [], totalOpportunities = weeklyRecommendations.length, weeklyCapacity = weeklyRecommendations.length, watchlist, canWrite = false, onPrepareWeek, onAction }: Props) {
  const visible = priorities.slice(0, 5)
  return (
    <div className="space-y-5">
      <section aria-labelledby="today-priorities">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="section-label">À faire maintenant</div>
            <h2 id="today-priorities" className="mt-1 font-cinzel text-xl font-bold text-pearl">Priorités éditoriales</h2>
          </div>
          <button type="button" onClick={onPrepareWeek} className="rounded-lg border border-pearl/10 px-3 py-2 text-xs text-pearl/70 hover:text-pearl">Préparer ma semaine</button>
        </div>
        {visible.length === 0 ? <div className="card-royal p-5 text-sm text-pearl/50">Aucune recommandation pour la période actuelle.</div> : (
          <div className="space-y-3">
            {visible.map((item) => {
              const band = item.band ?? item.priorityBand ?? 'NORMALE'
              return <article key={item.id} className="priority-row card-cinematic p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-full border border-cinematic-gold/35 px-2 py-0.5 text-cinematic-gold">{bandLabel[band]}</span>
                      <span className="text-pearl/60">{formatEditorialAction(item)}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-pearl/90">{item.title}</h3>
                    {item.status === 'PROPOSED' && item.suggestedFor && <div className="mt-1 text-xs text-pearl/45">Suggéré le {item.suggestedFor}</div>}
                    {item.status !== 'PROPOSED' && item.scheduledFor && <div className="mt-1 text-xs text-pearl/45">Prévu le {item.scheduledFor}</div>}
                  </div>
                  <RecommendationActionBar
                    canWrite={canWrite}
                    onAccept={() => onAction?.(item.id, 'ACCEPTED')}
                    onModify={() => onAction?.(item.id, 'MODIFY')}
                    onSchedule={() => onAction?.(item.id, 'SCHEDULED')}
                    onReject={() => onAction?.(item.id, 'REJECTED')}
                  />
                </div>
                <WhyDrawer why={item.why} evidence={item.evidence} />
              </article>
            })}
          </div>
        )}
      </section>
      <section aria-label="Recommandations de la semaine" className="grid gap-4 lg:grid-cols-2">
        <div className="card-royal p-4"><div className="section-label mb-2">Cette semaine</div><div className="text-sm text-pearl/55">{totalOpportunities} opportunités détectées · {weeklyRecommendations.length} retenues sur {weeklyCapacity} · {visible.length} priorités maintenant.</div></div>
        <div className="card-royal p-4"><div className="section-label mb-2">À surveiller</div><div className="text-sm text-pearl/55">{watchlist.length} opportunité(s) sans action immédiate.</div></div>
      </section>
    </div>
  )
}

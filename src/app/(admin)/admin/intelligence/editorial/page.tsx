'use client'

import { useEffect, useState } from 'react'
import { parseEditorialResponse } from '@/lib/intelligence/editorial/response-parser'
import React from 'react'
import { EditorialWorkspaceShell } from '@/components/admin/intelligence/editorial/EditorialWorkspaceShell'
import { buildEditorialWorkspaceReadModel } from '@/lib/intelligence/editorial/workspace-planning'

type Recommendation = {
  id: string
  recommendationKind?: 'CREATE' | 'REPURPOSE' | 'PROMOTE'
  contentKind?: string
  targetChannel?: string
  status?: string
  priorityBand?: 'FORTE' | 'NORMALE' | 'A_SURVEILLER'
  scheduledFor?: string | null
  windowStart?: string
  windowEnd?: string
  sourceTitle?: string | null
  sourceContentId?: string | null
  why?: string[]
  signals?: ReadonlyArray<Record<string, unknown>>
  humanTitleOverride?: string | null
  humanNotes?: string | null
  batchId?: string | null
  parentRecommendationId?: string | null
}

type Payload = {
  ok?: boolean
  data?: { organizationId: string; recommendations?: Recommendation[]; canWrite?: boolean; settings?: { timezone?: string; weeklyCapacity?: { weeklyTotal?: number } } }
  message?: string
}

function titleOf(item: Recommendation) {
  return item.humanTitleOverride ?? item.sourceTitle ?? `${item.contentKind ?? 'Contenu'} · ${item.targetChannel ?? 'canal à choisir'}`
}

export function buildEditorialWorkspaceSummary<T extends { priorityBand?: Recommendation['priorityBand'] }>(workspace: {
  priorities: T[]
  weeklyRecommendations: T[]
  opportunities: T[]
  calendarRecommendations: T[]
  weeklyCapacity: number
}) {
  return {
    priorities: workspace.priorities,
    weeklyRecommendations: workspace.weeklyRecommendations,
    opportunities: workspace.opportunities,
    calendarRecommendations: workspace.calendarRecommendations,
    totalOpportunities: workspace.opportunities.length,
    weeklyCapacity: workspace.weeklyCapacity,
    watchlist: workspace.opportunities.filter((item) => item.priorityBand === 'A_SURVEILLER'),
  }
}

export default function EditorialIntelligencePage() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/intelligence/editorial', { cache: 'no-store' })
      const json = await parseEditorialResponse<Payload>(res)
      if (!res.ok || json.ok === false) throw new Error(json.message ?? `HTTP ${res.status}`)
      setPayload(json)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Lecture éditoriale indisponible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function mutate(id: string, action: 'ACCEPTED' | 'SCHEDULED' | 'REJECTED' | 'MODIFY') {
    if (action === 'MODIFY') {
      setMessage('Utilisez Modifier dans le calendrier pour éditer la date et les notes.')
      return
    }
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/admin/intelligence/editorial/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: action }),
      })
      const json = await parseEditorialResponse<Payload>(res)
      if (!res.ok || json.ok === false) throw new Error(json.message ?? `HTTP ${res.status}`)
      setMessage('Décision éditoriale enregistrée.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Action éditoriale impossible.')
    }
  }

  async function refresh() {
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/intelligence/editorial/refresh', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      const json = await parseEditorialResponse<Payload>(res)
      if (!res.ok || json.ok === false) throw new Error(json.message ?? `HTTP ${res.status}`)
      setMessage('Actualisation terminée. Les sources indisponibles restent signalées comme telles.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Actualisation éditoriale impossible.')
    }
  }

  async function saveCalendar(id: string, values: { date: string; channel: string; notes: string }) {
    try {
      const res = await fetch(`/api/admin/intelligence/editorial/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scheduledFor: values.date, humanNotes: values.notes, humanEdit: { targetChannel: values.channel } }) })
      const json = await parseEditorialResponse<Payload>(res)
      if (!res.ok || json.ok === false) throw new Error(json.message ?? `HTTP ${res.status}`)
      setMessage('Planification éditoriale enregistrée.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Modification éditoriale impossible.')
    }
  }

  const recommendations = payload?.data?.recommendations ?? []
  const normalized = recommendations.map((item) => ({ ...item, title: titleOf(item), notes: item.humanNotes }))
  const workspace = buildEditorialWorkspaceReadModel(normalized, payload?.data?.settings, new Date())

  return (
    <div className="min-h-screen bg-abyss pb-16 pt-24">
      <div className="container-royal">
        {loading && !payload ? <div className="mb-4 rounded-lg border border-pearl/10 bg-pearl/5 px-3 py-2 text-sm text-pearl/60" role="status">Chargement du copilote éditorial…</div> : null}
        {error ? <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300" role="alert">{error}</div> : null}
        {message ? <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-200" role="status">{message}</div> : null}
        <EditorialWorkspaceShell
          organizationId={payload?.data?.organizationId ?? 'unknown'}
          activeView="today"
          canWrite={payload?.data?.canWrite ?? false}
          summary={buildEditorialWorkspaceSummary(workspace)}
          onRefresh={() => void refresh()}
          onPrepareWeek={() => setMessage('Aperçu de la semaine prêt. Chaque décision doit être acceptée individuellement ou explicitement par l’utilisateur.')}
          onAction={(id, action) => void mutate(id, action)}
          onCalendarSave={(id, values) => void saveCalendar(id, values)}
        />
      </div>
    </div>
  )
}

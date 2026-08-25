'use client'

import { useEffect, useState } from 'react'
import React from 'react'
import { EditorialWorkspaceShell } from '@/components/admin/intelligence/editorial/EditorialWorkspaceShell'

type Payload = {
  ok?: boolean
  data?: { organizationId: string; recommendations?: never[]; calendar?: unknown; settings?: unknown }
  message?: string
}

export default function EditorialIntelligencePage() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetch('/api/admin/intelligence/editorial', { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json()) as Payload
        if (!res.ok || json.ok === false) throw new Error(json.message ?? `HTTP ${res.status}`)
        setPayload(json)
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Lecture éditoriale indisponible.'))
  }, [])

  return (
    <div className="min-h-screen bg-abyss pb-16 pt-24">
      <div className="container-royal">
        {error ? <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-300">{error}</div> : null}
        <EditorialWorkspaceShell
          organizationId={payload?.data?.organizationId ?? 'unknown'}
          activeView="today"
          summary={{ priorities: [], weeklyRecommendations: [], watchlist: [] }}
        />
      </div>
    </div>
  )
}

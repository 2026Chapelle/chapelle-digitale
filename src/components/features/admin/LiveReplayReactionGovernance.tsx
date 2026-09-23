'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

const ADMIN_REPLAY_REACTIONS_ENDPOINT = '/api/admin/live/replay/reactions'

export type ReplayReactionGovernanceLive = {
  cmsLiveId: string
  title: string
  status: string
  organizationId: string | null
  organizationUnitId: string | null
  enabled: boolean
}

export type ReplayReactionGovernanceUnit = {
  id: string
  name: string
  unitType: string
  parentId: string | null
}

export type ReplayReactionGovernanceData = {
  lives: ReplayReactionGovernanceLive[]
  units: ReplayReactionGovernanceUnit[]
  canManageGlobal: boolean
}

export type ReplayReactionGovernancePatch = {
  cmsLiveId: string
  enabled: boolean
  organizationId: string | null
  organizationUnitId: string | null
}

export type ReplayReactionScopeOption = {
  value: string
  label: string
}

export function buildReplayReactionScopeOptions(
  units: ReplayReactionGovernanceUnit[],
  canManageGlobal: boolean,
): ReplayReactionScopeOption[] {
  return [
    ...(canManageGlobal ? [{ value: 'global', label: 'Global' }] : []),
    ...units.map((unit) => ({
      value: unit.id,
      label: unit.name,
    })),
  ]
}

export function replaceReplayReactionLive(
  lives: ReplayReactionGovernanceLive[],
  replacement: ReplayReactionGovernanceLive,
): ReplayReactionGovernanceLive[] {
  return lives.map((live) =>
    live.cmsLiveId === replacement.cmsLiveId ? replacement : live,
  )
}

export function buildReplayReactionGovernancePatch(
  live: ReplayReactionGovernanceLive,
): ReplayReactionGovernancePatch {
  return {
    cmsLiveId: live.cmsLiveId,
    enabled: live.enabled,
    organizationId: live.organizationId,
    organizationUnitId: live.organizationUnitId,
  }
}

type ListResponse =
  | { ok: true; data: ReplayReactionGovernanceData }
  | { ok: false; reason?: string }

type PatchResponse =
  | { ok: true; data: { live: ReplayReactionGovernanceLive } }
  | { ok: false; reason?: string }

export function LiveReplayReactionGovernance() {
  const [data, setData] = useState<ReplayReactionGovernanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(ADMIN_REPLAY_REACTIONS_ENDPOINT, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      })
      const payload = (await response.json()) as ListResponse

      if (!response.ok || !payload.ok) {
        throw new Error('load_failed')
      }

      setData(payload.data)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setMessage('Impossible de charger les réglages des réactions.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  const scopeOptions = useMemo(
    () => buildReplayReactionScopeOptions(
      data?.units ?? [],
      data?.canManageGlobal ?? false,
    ),
    [data?.canManageGlobal, data?.units],
  )

  const knownOrganizationId = useMemo(
    () => data?.lives.find((live) => live.organizationId)?.organizationId ?? null,
    [data?.lives],
  )

  const persist = useCallback(async (
    confirmed: ReplayReactionGovernanceLive,
    optimistic: ReplayReactionGovernanceLive,
  ) => {
    setMessage(null)
    setPendingIds((current) => new Set(current).add(confirmed.cmsLiveId))
    setData((current) => current ? {
      ...current,
      lives: replaceReplayReactionLive(current.lives, optimistic),
    } : current)

    try {
      const response = await fetch(ADMIN_REPLAY_REACTIONS_ENDPOINT, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(buildReplayReactionGovernancePatch(optimistic)),
      })
      const payload = (await response.json()) as PatchResponse

      if (!response.ok || !payload.ok) {
        throw new Error('patch_failed')
      }

      setData((current) => current ? {
        ...current,
        lives: replaceReplayReactionLive(current.lives, payload.data.live),
      } : current)
    } catch {
      setData((current) => current ? {
        ...current,
        lives: replaceReplayReactionLive(current.lives, confirmed),
      } : current)
      setMessage('La modification n’a pas été enregistrée. L’état confirmé a été rétabli.')
    } finally {
      setPendingIds((current) => {
        const next = new Set(current)
        next.delete(confirmed.cmsLiveId)
        return next
      })
    }
  }, [])

  function changeScope(live: ReplayReactionGovernanceLive, scope: string) {
    if (scope === 'global') {
      if (!data?.canManageGlobal) return
      void persist(live, {
        ...live,
        organizationId: null,
        organizationUnitId: null,
      })
      return
    }

    const allowedUnit = data?.units.find((unit) => unit.id === scope)
    const organizationId = live.organizationId ?? knownOrganizationId
    if (!allowedUnit || !organizationId) {
      setMessage('Cette portée ne peut pas être appliquée depuis les données autorisées.')
      return
    }

    void persist(live, {
      ...live,
      organizationId,
      organizationUnitId: allowedUnit.id,
    })
  }

  return (
    <section
      aria-labelledby="replay-reaction-governance-title"
      className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cinematic-gold">
          Gouvernance LIVE 4C
        </p>
        <h2
          id="replay-reaction-governance-title"
          className="mt-2 text-xl font-semibold text-white"
        >
          Réactions des replays
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Activez les réactions et définissez la portée de chaque replay autorisé.
        </p>
      </div>

      {message ? (
        <p role="status" className="mb-4 text-sm text-amber-300/90">
          {message}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-white/55">Chargement des réglages…</p>
      ) : null}

      {!loading && data && data.lives.length === 0 ? (
        <p className="text-sm text-white/55">Aucun replay administrable dans votre périmètre.</p>
      ) : null}

      {!loading && data && data.lives.length > 0 ? (
        <div className="space-y-3">
          {data.lives.map((live) => {
            const pending = pendingIds.has(live.cmsLiveId)
            const scopeValue = live.organizationUnitId ?? 'global'

            return (
              <article
                key={live.cmsLiveId}
                className="grid gap-4 rounded-xl border border-white/10 bg-black/15 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-white">
                    {live.title || 'Replay sans titre'}
                  </h3>
                  <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
                    {live.status || 'statut inconnu'}
                  </p>
                </div>

                <label className="grid gap-1 text-sm text-white/70">
                  <span>Portée du replay</span>
                  <select
                    aria-label={`Portée du replay ${live.title}`}
                    value={scopeValue}
                    disabled={pending}
                    onChange={(event) => changeScope(live, event.target.value)}
                    className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cinematic-gold disabled:opacity-60"
                  >
                    {scopeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex items-center justify-between gap-3 lg:justify-end">
                  <span className="text-sm text-white/70">Réactions actives</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={live.enabled}
                    aria-label={`Réactions actives pour ${live.title}`}
                    disabled={pending}
                    onClick={() => void persist(live, { ...live, enabled: !live.enabled })}
                    className={`relative h-7 w-12 rounded-full border transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      live.enabled
                        ? 'border-cinematic-gold bg-cinematic-gold/80'
                        : 'border-white/20 bg-white/10'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        live.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

'use client'
/**
 * HUB-4 — Panneau « Sources de données & connexions ».
 * Affiche l'ÉTAT RÉEL de chaque canal via /api/intelligence/status (no-store).
 * Aucun état n'est codé en dur : tout provient de la réponse serveur. Les libellés
 * d'état et de fraîcheur viennent des contrats partagés (jamais inventés ici).
 */
import { useEffect, useState } from 'react'
import { RefreshCw, AlertTriangle, Settings2, CheckCircle2, Radio } from 'lucide-react'
import {
  CHANNEL_STATE_LABEL_FR,
  CHANNEL_STATE_COLOR,
  isLiveState,
  type ChannelStatus,
  type ChannelStatusReport,
} from '@/lib/intelligence/channels/types'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'

type LoadState = 'loading' | 'ready' | 'error'

/** Formatage relatif honnête (jamais « maintenant » si null). */
function relativeSince(iso: string | null, now: number): string {
  if (!iso) return 'Jamais synchronisé'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "À l'instant"
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return `il y a ${d} j`
}

function absolute(iso: string | null): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function StatusCard({ ch, now }: { ch: ChannelStatus; now: number }) {
  const color = CHANNEL_STATE_COLOR[ch.state]
  const live = isLiveState(ch.state)
  return (
    <div className="card-royal p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-pearl truncate">{ch.displayName}</div>
          {ch.property && (
            <div className="text-[11px] text-pearl/40 truncate mt-0.5">{ch.property}</div>
          )}
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium flex-shrink-0"
          style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}40` }}
        >
          {live ? (
            <CheckCircle2 className="w-3 h-3" aria-hidden />
          ) : (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
          )}
          {CHANNEL_STATE_LABEL_FR[ch.state]}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-pearl/50">
        <Radio className="w-3 h-3" aria-hidden />
        <span>Fraîcheur : {FRESHNESS_LABELS_FR[ch.freshness]}</span>
      </div>

      <div className="text-[11px] text-pearl/50" title={absolute(ch.lastSync)}>
        Dernière synchro : {relativeSince(ch.lastSync, now)}
      </div>

      {ch.reason && <div className="text-[11px] text-pearl/40 leading-snug">{ch.reason}</div>}

      {ch.setupRequired && (
        <div className="flex items-center gap-1.5 text-[11px] text-cinematic-gold mt-0.5">
          <Settings2 className="w-3 h-3" aria-hidden />
          <span>Configuration requise</span>
        </div>
      )}
    </div>
  )
}

export default function SourcesStatus() {
  const [state, setState] = useState<LoadState>('loading')
  const [report, setReport] = useState<ChannelStatusReport | null>(null)
  const [now, setNow] = useState(() => Date.now())

  async function load() {
    setState('loading')
    try {
      const res = await fetch('/api/intelligence/status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`http_${res.status}`)
      const data: ChannelStatusReport = await res.json()
      setReport(data)
      setNow(Date.now())
      setState('ready')
    } catch {
      setState('error')
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <section className="card-royal p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="section-label">Sources de données & connexions</div>
          <p className="text-xs text-pearl/40 mt-1">
            État réel de chaque canal — aucune donnée fabriquée.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={state === 'loading'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-pearl/70 border border-pearl/10 hover:text-pearl hover:border-pearl/30 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} aria-hidden />
          Actualiser
        </button>
      </div>

      {state === 'loading' && (
        <div className="text-sm text-pearl/50 py-6 text-center">Chargement de l’état réel…</div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-400/90 py-6 justify-center">
          <AlertTriangle className="w-4 h-4" aria-hidden />
          <span>Impossible de récupérer l’état des sources.</span>
          <button type="button" onClick={load} className="underline hover:text-red-300">
            Réessayer
          </button>
        </div>
      )}

      {state === 'ready' && report && report.channels.length === 0 && (
        <div className="text-sm text-pearl/50 py-6 text-center">Aucune source déclarée.</div>
      )}

      {state === 'ready' && report && report.channels.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.channels.map((ch) => (
              <StatusCard key={ch.channel} ch={ch} now={now} />
            ))}
          </div>
          <p className="text-[11px] text-pearl/30 mt-3">
            Vérifié le {absolute(report.generatedAt)}
          </p>
        </>
      )}
    </section>
  )
}

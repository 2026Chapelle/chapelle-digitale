'use client'
import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, Clock, RefreshCw, Youtube } from 'lucide-react'

type SyncStatus = {
  configured: boolean
  lastRun: { startedAt: string; finishedAt: string | null; ok: boolean | null; summary: Record<string, unknown> } | null
  states: { scheduled: number; live: number; replayPending: number; replayAvailable: number } | null
}

const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

/**
 * Synchronisation YouTube Live → Replay (admin). États : Live programmé, En direct, Replay en attente,
 * Replay disponible, Erreur de synchronisation. Relance manuelle sécurisée (POST admin), non obligatoire.
 */
export default function YouTubeSyncPanel() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/live/sync', { method: 'GET', cache: 'no-store', credentials: 'same-origin' })
      if (!response.ok) { setUnavailable(true); return }
      const payload = await response.json().catch(() => null)
      if (!payload?.ok) { setUnavailable(true); return }
      setStatus(payload as SyncStatus)
      setUnavailable(false)
    } catch {
      setUnavailable(true)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const relaunch = async () => {
    setRunning(true)
    setLastMessage(null)
    try {
      const response = await fetch('/api/admin/live/sync', { method: 'POST', cache: 'no-store', credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      if (payload?.ok) setLastMessage(`Synchronisation terminée : ${payload.inserted ?? 0} ajout(s), ${payload.updated ?? 0} mise(s) à jour.`)
      else setLastMessage(`Erreur de synchronisation : ${payload?.error || 'indisponible'}.`)
    } catch {
      setLastMessage('Erreur de synchronisation : indisponible.')
    } finally {
      setRunning(false)
      void refresh()
    }
  }

  const lastError = status?.lastRun && status.lastRun.ok === false ? String(status.lastRun.summary?.error || 'erreur') : null
  const cards = [
    { label: 'Live programmé', value: status?.states?.scheduled },
    { label: 'En direct', value: status?.states?.live },
    { label: 'Replay en attente', value: status?.states?.replayPending },
    { label: 'Replay disponible', value: status?.states?.replayAvailable },
  ]

  return (
    <section className="card-royal">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/15 flex items-center justify-center">
            <Youtube className="w-4 h-4 text-gold" />
          </div>
          <div>
            <h3 className="font-cinzel text-sm font-bold text-pearl">Synchronisation YouTube → Replay</h3>
            <p className="font-inter text-[11px] text-pearl/40">Programmé · En direct · Replay en attente · Replay disponible</p>
          </div>
        </div>
        <button type="button" onClick={relaunch} disabled={running || unavailable} className="inline-flex items-center gap-2 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 font-inter text-xs font-semibold text-gold hover:bg-gold/15 disabled:opacity-40">
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} /> Relancer la synchronisation
        </button>
      </div>

      {unavailable && <p className="font-inter text-xs text-pearl/40">Statut momentanément indisponible.</p>}

      {!unavailable && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {cards.map(card => (
              <div key={card.label} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
                <p className="font-inter text-[10px] uppercase tracking-[.18em] text-pearl/40">{card.label}</p>
                <p className="font-cinzel text-xl text-pearl mt-1">{card.value ?? '—'}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2 font-inter text-xs text-pearl/60">
            {lastError ? <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" /> : status?.lastRun ? <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" /> : <Clock className="w-4 h-4 text-pearl/40 mt-0.5" />}
            <div>
              {!status?.configured && <p>Connecteur YouTube non configuré sur ce serveur (variables OAuth absentes).</p>}
              {status?.lastRun ? (
                <p>Dernier passage : {fmt(status.lastRun.startedAt)} · {lastError ? <span className="text-red-300">Erreur de synchronisation ({lastError})</span> : 'Succès'}</p>
              ) : (
                <p>Aucun passage enregistré. Activez le cron N0C sur /api/cron/youtube-live-sync ou relancez manuellement.</p>
              )}
              {lastMessage && <p className="mt-1 text-pearl/80">{lastMessage}</p>}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, Loader2, Save } from 'lucide-react'

type Step = {
  id: string
  step_key: string
  label: string
  position: number
  is_enabled: boolean
  follow_up_hours: number | null
}

export function PastoralSettingsPanel() {
  const [steps, setSteps] = useState<Step[]>([])
  const [templateName, setTemplateName] = useState('')
  const [locked, setLocked] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/pastoral-settings', { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Chargement pastoral impossible.')
        return
      }
      setSteps((j.data?.steps || []) as Step[])
      setTemplateName(j.data?.template?.name || 'Parcours Nouveau Venu')
      setLocked(j.data?.meta?.pastoralLocked !== false)
      setCanEdit(!!j.data?.meta?.canEdit)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!canEdit || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const r = await fetch('/api/admin/pastoral-settings', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          steps: steps.map((s) => ({
            id: s.id,
            is_enabled: s.is_enabled,
            follow_up_hours: s.follow_up_hours,
            label: s.label,
          })),
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Enregistrement impossible.')
        return
      }
      setSteps((j.data?.steps || steps) as Step[])
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-1.5 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-gold" />
        Parcours pastoral mondial
      </h2>
      <p className="text-[11px] text-pearl/40 font-inter mb-4">
        Clés techniques stables (step_key). Hérité par toutes les unités.
        {locked && (
          <span className="text-amber-400/80"> · Verrouillé par le siège mondial</span>
        )}
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-pearl/50 py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gold" /> Chargement…
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-pearl/50 font-inter block mb-1.5">Nom du modèle</label>
            <input
              className="input-royal w-full"
              value={templateName}
              disabled={!canEdit || locked || saving}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-pearl/[0.06]"
            >
              <span className="text-[11px] text-pearl/35 w-6">{idx + 1}</span>
              <div className="flex-1 min-w-[140px]">
                <p className="text-sm text-pearl font-inter">{s.label}</p>
                <p className="text-[10px] text-pearl/35 font-mono">{s.step_key}</p>
              </div>
              <label className="text-[11px] text-pearl/50 flex items-center gap-1.5">
                Actif
                <input
                  type="checkbox"
                  checked={s.is_enabled}
                  disabled={!canEdit || locked || saving}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((x) =>
                        x.id === s.id ? { ...x, is_enabled: e.target.checked } : x,
                      ),
                    )
                  }
                />
              </label>
              <label className="text-[11px] text-pearl/50 flex items-center gap-1.5">
                Relance (h)
                <input
                  type="number"
                  min={0}
                  className="input-royal w-20 py-1 text-xs"
                  disabled={!canEdit || locked || saving}
                  value={s.follow_up_hours ?? ''}
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Number(e.target.value)
                    setSteps((prev) =>
                      prev.map((x) =>
                        x.id === s.id ? { ...x, follow_up_hours: v } : x,
                      ),
                    )
                  }}
                />
              </label>
            </div>
          ))}
          {steps.length === 0 && (
            <p className="text-[12px] text-pearl/40">Aucun step — appliquer la migration Lot 5.</p>
          )}
          {error && <p className="text-[12px] text-danger font-inter">{error}</p>}
          {canEdit && !locked && (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Enregistré' : 'Enregistrer le parcours'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

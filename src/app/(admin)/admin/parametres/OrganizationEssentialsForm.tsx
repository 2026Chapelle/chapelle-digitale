'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Globe, Loader2, Save } from 'lucide-react'

type OrgEssentials = {
  id: string
  name: string
  slug: string
  status: string
  country: string | null
  timezone: string
  default_locale: string
  default_currency: string
  updated_at: string
}

type FormState = {
  name: string
  country: string
  timezone: string
  default_locale: string
  default_currency: string
}

const EMPTY_FORM: FormState = {
  name: '',
  country: '',
  timezone: '',
  default_locale: '',
  default_currency: '',
}

/**
 * Lot 4 — formulaire réel des paramètres essentiels organisation.
 * Autonome : GET/PATCH /api/admin/organization uniquement.
 * Aucune valeur mock (EUR / Europe/Paris) en initialisation.
 */
export function OrganizationEssentialsForm() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [meta, setMeta] = useState<{ slug?: string; status?: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    setSaveError(null)
    try {
      const r = await fetch('/api/admin/organization', {
        method: 'GET',
        credentials: 'same-origin',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok || !j?.data) {
        setLoadError(j?.message || 'Chargement impossible.')
        setForm(EMPTY_FORM)
        setMeta(null)
        return
      }
      const d = j.data as OrgEssentials
      setForm({
        name: typeof d.name === 'string' ? d.name : '',
        country: d.country == null ? '' : String(d.country),
        timezone: typeof d.timezone === 'string' ? d.timezone : '',
        default_locale: typeof d.default_locale === 'string' ? d.default_locale : '',
        default_currency: typeof d.default_currency === 'string' ? d.default_currency : '',
      })
      setMeta({ slug: d.slug, status: d.status })
    } catch {
      setLoadError('Erreur réseau')
      setForm(EMPTY_FORM)
      setMeta(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (loading || saving) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const body = {
        name: form.name,
        country: form.country,
        timezone: form.timezone,
        default_locale: form.default_locale,
        default_currency: form.default_currency,
      }
      const r = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok || !j?.data) {
        setSaveError(j?.message || 'Enregistrement impossible.')
        return
      }
      const d = j.data as OrgEssentials
      setForm({
        name: typeof d.name === 'string' ? d.name : '',
        country: d.country == null ? '' : String(d.country),
        timezone: typeof d.timezone === 'string' ? d.timezone : '',
        default_locale: typeof d.default_locale === 'string' ? d.default_locale : '',
        default_currency: typeof d.default_currency === 'string' ? d.default_currency : '',
      })
      setMeta({ slug: d.slug, status: d.status })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setSaveError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const disabled = loading || saving || !!loadError

  return (
    <div className="card-royal">
      <h2 className="font-cinzel text-sm font-bold text-pearl mb-1.5 flex items-center gap-2">
        <Globe className="w-4 h-4 text-gold" />
        Organisation (ERP)
      </h2>
      <p className="text-[11px] text-pearl/40 font-inter mb-4">
        Paramètres essentiels de l&apos;organisation canonique. Slug et statut non modifiables ici.
      </p>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-pearl/50 font-inter py-6">
          <Loader2 className="w-4 h-4 animate-spin text-gold" />
          Chargement…
        </div>
      )}

      {loadError && !loading && (
        <div className="space-y-3">
          <p className="text-[12px] text-danger font-inter">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="btn-gold-cinematic px-4 py-2 text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !loadError && (
        <div className="space-y-4">
          {meta?.slug && (
            <p className="text-[11px] text-pearl/35 font-inter">
              Identifiant technique : <span className="text-pearl/55">{meta.slug}</span>
              {meta.status ? ` · ${meta.status}` : ''}
            </p>
          )}

          <div>
            <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
              Nom
            </label>
            <input
              className="input-royal w-full"
              value={form.name}
              disabled={disabled}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={200}
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
              Pays
            </label>
            <input
              className="input-royal w-full"
              value={form.country}
              disabled={disabled}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              maxLength={100}
              placeholder="ex. Côte d'Ivoire ou CI"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
                Fuseau horaire
              </label>
              <input
                className="input-royal w-full"
                value={form.timezone}
                disabled={disabled}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="Africa/Abidjan"
                list="org-tz-suggestions"
              />
              <datalist id="org-tz-suggestions">
                <option value="Africa/Abidjan" />
                <option value="Africa/Kinshasa" />
                <option value="Europe/Paris" />
                <option value="America/Montreal" />
              </datalist>
            </div>
            <div>
              <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
                Langue par défaut
              </label>
              <input
                className="input-royal w-full"
                value={form.default_locale}
                disabled={disabled}
                onChange={(e) => setForm((f) => ({ ...f, default_locale: e.target.value }))}
                placeholder="fr"
                maxLength={35}
              />
            </div>
            <div>
              <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
                Devise par défaut
              </label>
              <input
                className="input-royal w-full"
                value={form.default_currency}
                disabled={disabled}
                onChange={(e) => setForm((f) => ({ ...f, default_currency: e.target.value }))}
                placeholder="XOF"
                maxLength={3}
              />
            </div>
          </div>

          {saveError && (
            <p className="text-[12px] text-danger font-inter">{saveError}</p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => void save()}
              disabled={disabled}
              className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Enregistré' : saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

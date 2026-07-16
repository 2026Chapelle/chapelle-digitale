'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, MapPin, Save, Bell } from 'lucide-react'

type Props = {
  unitId: string | null
  unitLabel?: string
  unitType?: string
}

type UnitSettings = {
  local_display_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  timezone: string | null
  default_locale: string | null
  default_currency: string | null
  notif_email_enabled: boolean
  notif_push_enabled: boolean
  notif_digest_enabled: boolean
  notif_newcomer_alert: boolean
  notif_followup_alert: boolean
  notif_new_member_alert: boolean
  notif_escalate_national: boolean
  notif_escalate_zone: boolean
}

const EMPTY: UnitSettings = {
  local_display_name: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  timezone: '',
  default_locale: '',
  default_currency: '',
  notif_email_enabled: true,
  notif_push_enabled: false,
  notif_digest_enabled: true,
  notif_newcomer_alert: true,
  notif_followup_alert: true,
  notif_new_member_alert: true,
  notif_escalate_national: true,
  notif_escalate_zone: false,
}

export function UnitSettingsForm({ unitId, unitLabel, unitType }: Props) {
  const [form, setForm] = useState<UnitSettings>(EMPTY)
  const [inherited, setInherited] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!unitId) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(
        `/api/admin/organization-unit-settings?unitId=${encodeURIComponent(unitId)}`,
        { credentials: 'same-origin' },
      )
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Chargement impossible.')
        setForm(EMPTY)
        return
      }
      const s = j.data?.settings || {}
      setForm({
        local_display_name: s.local_display_name ?? '',
        contact_email: s.contact_email ?? '',
        contact_phone: s.contact_phone ?? '',
        address: s.address ?? '',
        timezone: s.timezone ?? '',
        default_locale: s.default_locale ?? '',
        default_currency: s.default_currency ?? '',
        notif_email_enabled: s.notif_email_enabled !== false,
        notif_push_enabled: !!s.notif_push_enabled,
        notif_digest_enabled: s.notif_digest_enabled !== false,
        notif_newcomer_alert: s.notif_newcomer_alert !== false,
        notif_followup_alert: s.notif_followup_alert !== false,
        notif_new_member_alert: s.notif_new_member_alert !== false,
        notif_escalate_national: s.notif_escalate_national !== false,
        notif_escalate_zone: !!s.notif_escalate_zone,
      })
      setInherited(j.data?.inherited || null)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [unitId])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!unitId || loading || saving) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const r = await fetch('/api/admin/organization-unit-settings', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          local_display_name: form.local_display_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          address: form.address || null,
          timezone: form.timezone || null,
          default_locale: form.default_locale || null,
          default_currency: form.default_currency || null,
          notif_email_enabled: form.notif_email_enabled,
          notif_push_enabled: form.notif_push_enabled,
          notif_digest_enabled: form.notif_digest_enabled,
          notif_newcomer_alert: form.notif_newcomer_alert,
          notif_followup_alert: form.notif_followup_alert,
          notif_new_member_alert: form.notif_new_member_alert,
          notif_escalate_national: form.notif_escalate_national,
          notif_escalate_zone: form.notif_escalate_zone,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Enregistrement impossible.')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  if (!unitId) {
    return (
      <div className="card-royal text-[12px] text-pearl/45 font-inter">
        Sélectionnez une unité dans la hiérarchie.
      </div>
    )
  }

  const disabled = loading || saving
  const notifLocked = inherited?.notificationsLocked === true

  return (
    <div className="card-royal space-y-5">
      <div>
        <h2 className="font-cinzel text-sm font-bold text-pearl mb-1 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gold" />
          Paramètres d&apos;unité
        </h2>
        <p className="text-[11px] text-pearl/40 font-inter">
          {unitLabel || unitId}
          {unitType ? ` · ${unitType}` : ''}
        </p>
        {inherited?.brandingLocked === true ? (
          <p className="text-[11px] text-amber-400/80 font-inter mt-1">
            Branding mondial verrouillé par le siège (hérité).
          </p>
        ) : null}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-pearl/50">
          <Loader2 className="w-4 h-4 animate-spin text-gold" /> Chargement…
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(
              [
                ['local_display_name', 'Nom local (surcharge)'],
                ['contact_email', 'Email de contact'],
                ['contact_phone', 'Téléphone'],
                ['address', 'Adresse'],
                ['timezone', 'Fuseau (surcharge)'],
                ['default_locale', 'Langue (surcharge)'],
                ['default_currency', 'Devise (surcharge)'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-pearl/50 font-inter font-medium block mb-1.5">
                  {label}
                  {!(form[key] as string) ? (
                    <span className="ml-1 text-pearl/30 font-normal">· hérité</span>
                  ) : null}
                </label>
                <input
                  className="input-royal w-full"
                  disabled={disabled}
                  value={(form[key] as string) || ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <div>
            <h3 className="font-cinzel text-xs font-bold text-pearl mb-3 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-gold" />
              Notifications
              {notifLocked && (
                <span className="text-[10px] text-amber-400/80 font-inter font-normal">
                  verrouillé siège
                </span>
              )}
            </h3>
            <div className="space-y-2">
              {(
                [
                  ['notif_email_enabled', 'Email'],
                  ['notif_push_enabled', 'Push'],
                  ['notif_digest_enabled', 'Digest'],
                  ['notif_newcomer_alert', 'Alerte nouveaux venus'],
                  ['notif_followup_alert', 'Alerte relances pastorales'],
                  ['notif_new_member_alert', 'Alerte nouveaux membres'],
                  ['notif_escalate_national', 'Remontée nationale'],
                  ['notif_escalate_zone', 'Remontée zone'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center justify-between py-2 border-b border-pearl/[0.04] text-sm text-pearl/70 font-inter"
                >
                  {label}
                  <input
                    type="checkbox"
                    disabled={disabled || notifLocked}
                    checked={!!form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  />
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-danger font-inter">{error}</p>}

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
            {saved ? 'Enregistré' : 'Enregistrer l’unité'}
          </button>
        </>
      )}
    </div>
  )
}

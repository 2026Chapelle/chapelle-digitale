'use client'
/**
 * Gestion des PASSKEYS (WebAuthn) de l'administrateur nominatif courant.
 *
 * Composant AUTONOME (motif « LivretSetting ») : il ne touche pas au formulaire
 * général et se branche sur les routes serveur déjà testées /api/admin/passkeys/*.
 *
 * Prérequis d'usage : être connecté au back-office en mode « Compte
 * administrateur » (session Supabase nominative). L'enrôlement et la révocation
 * exigent en plus une réauthentification RÉCENTE ; si le serveur la réclame
 * (code `reauth_required`), on redemande le mot de passe et on rejoue l'action.
 *
 * Rappel sécurité : aucune donnée biométrique n'est collectée ni transmise ;
 * la vérification empreinte/visage/PIN reste locale à l'appareil.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  Fingerprint, Loader2, Plus, Trash2, Pencil, Check, X,
  ShieldCheck, AlertCircle, KeyRound,
} from 'lucide-react'
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'
import { getBrowserClient } from '@/lib/supabase-browser'
import { IS_DEMO_MODE } from '@/lib/supabase'

interface Passkey {
  id: string
  friendlyName: string
  deviceType: string | null
  backedUp: boolean
  createdAt: string
  lastUsedAt: string | null
}

type Pending = { run: () => Promise<void>; label: string } | null

export function PasskeysManager() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<Passkey[]>([])
  const [noSession, setNoSession] = useState(false)
  const [sessionEmail, setSessionEmail] = useState<string | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Réauth : action en attente + mot de passe redemandé.
  const [pending, setPending] = useState<Pending>(null)
  const [password, setPassword] = useState('')

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/passkeys', { credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401 || data?.code === 'no_session') { setNoSession(true); setList([]); return }
      setNoSession(false)
      if (data?.ok) setList(data.passkeys || [])
    } catch { /* réseau : liste laissée en l'état */ }
  }, [])

  useEffect(() => {
    if (IS_DEMO_MODE) { setSupported(false); setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const ok = browserSupportsWebAuthn()
      if (cancelled) return
      setSupported(ok)
      const client = getBrowserClient()
      if (client) {
        const { data } = await client.auth.getUser()
        if (!cancelled) setSessionEmail(data.user?.email ?? null)
      }
      if (ok) await fetchList()
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [fetchList])

  /** Demande la réauthentification puis rejouera l'action une fois le mot de passe confirmé. */
  function askReauth(run: () => Promise<void>, label: string) {
    setPending({ run, label }); setError(null)
  }

  async function doReauth(e: React.FormEvent) {
    e.preventDefault()
    if (!pending || !password) return
    const client = getBrowserClient()
    if (!client || !sessionEmail) { setError('Session nominative indisponible.'); return }
    setBusy(true); setError(null)
    try {
      const { error: signErr } = await client.auth.signInWithPassword({ email: sessionEmail, password })
      if (signErr) { setError('Mot de passe incorrect.'); setBusy(false); return }
      const run = pending.run
      setPending(null); setPassword('')
      await run()
    } catch { setError('Réauthentification impossible.') }
    finally { setBusy(false) }
  }

  async function addPasskey() {
    setBusy(true); setError(null); setNotice(null)
    try {
      const friendlyName = newName.trim()
      const optRes = await fetch('/api/admin/passkeys/register/options', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const opt = await optRes.json().catch(() => ({}))
      if (opt?.code === 'reauth_required') { askReauth(addPasskey, 'ajouter une passkey'); return }
      if (opt?.code === 'no_session') { setNoSession(true); setError('Connectez-vous en mode « Compte administrateur ».'); return }
      if (!opt?.ok) { setError(opt?.message || 'Impossible de préparer l’enrôlement.'); return }

      let attResp
      try {
        attResp = await startRegistration({ optionsJSON: opt.options })
      } catch (err: any) {
        if (err?.name === 'InvalidStateError') setError('Cet appareil possède déjà une passkey enregistrée.')
        else if (err?.name === 'NotAllowedError') setError('Enrôlement annulé.')
        else setError('La création de la passkey a échoué.')
        return
      }

      const vrfRes = await fetch('/api/admin/passkeys/register/verify', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: opt.challengeId, response: attResp, friendlyName }),
      })
      const vrf = await vrfRes.json().catch(() => ({}))
      if (vrf?.code === 'reauth_required') { askReauth(addPasskey, 'ajouter une passkey'); return }
      if (!vrf?.ok) { setError(vrf?.message || 'Enregistrement impossible.'); return }

      setNewName(''); setNotice('Passkey ajoutée.')
      await fetchList()
    } catch { setError('Erreur réseau.') }
    finally { setBusy(false) }
  }

  async function saveRename(id: string) {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/admin/passkeys/${id}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!data?.ok) { setError(data?.message || 'Renommage impossible.'); return }
      setRenamingId(null)
      await fetchList()
    } catch { setError('Erreur réseau.') }
    finally { setBusy(false) }
  }

  async function revoke(id: string, name: string) {
    setBusy(true); setError(null); setNotice(null)
    try {
      const res = await fetch(`/api/admin/passkeys/${id}`, { method: 'DELETE', credentials: 'same-origin' })
      const data = await res.json().catch(() => ({}))
      if (data?.code === 'reauth_required') { askReauth(() => revoke(id, name), `révoquer « ${name} »`); return }
      if (data?.code === 'lockout') { setError('Impossible : ce serait la dernière méthode de connexion.'); return }
      if (!data?.ok) { setError(data?.message || 'Révocation impossible.'); return }
      setNotice('Passkey révoquée.')
      await fetchList()
    } catch { setError('Erreur réseau.') }
    finally { setBusy(false) }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const card = 'card-royal'
  const heading = (
    <h2 className="font-cinzel text-sm font-bold text-pearl mb-1.5 flex items-center gap-2">
      <Fingerprint className="w-4 h-4 text-gold" />
      Passkeys (connexion sans mot de passe)
    </h2>
  )

  if (IS_DEMO_MODE || supported === false) {
    return (
      <div className={card}>
        {heading}
        <p className="text-[11px] text-pearl/40 font-inter">
          {IS_DEMO_MODE
            ? 'Indisponible en mode démonstration.'
            : "Cet appareil ou navigateur ne prend pas en charge les passkeys (WebAuthn)."}
        </p>
      </div>
    )
  }

  return (
    <div className={card}>
      {heading}
      <p className="text-[11px] text-pearl/40 font-inter mb-4">
        Connectez-vous au back-office avec votre visage, votre empreinte ou le code de l'appareil.
        Aucune donnée biométrique n'est stockée — seule une clé cryptographique publique est conservée.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-pearl/40 text-sm font-inter py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      ) : noSession ? (
        <div className="flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="font-inter text-xs text-amber-300/90">
            Les passkeys sont liées à votre compte nominatif. Reconnectez-vous via
            l'onglet <strong>« Compte administrateur »</strong> pour les gérer.
          </p>
        </div>
      ) : (
        <>
          {/* Liste des passkeys actives */}
          {list.length === 0 ? (
            <div className="p-3 rounded-xl text-center mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="font-inter text-xs text-pearl/40">Aucune passkey enregistrée pour votre compte.</p>
            </div>
          ) : (
            <ul className="space-y-2 mb-4">
              {list.map((pk) => (
                <li key={pk.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
                    <KeyRound className="w-4 h-4 text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {renamingId === pk.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="input-royal py-1 text-sm flex-1"
                          value={renameValue}
                          maxLength={60}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(pk.id) }}
                          autoFocus
                        />
                        <button onClick={() => saveRename(pk.id)} disabled={busy}
                          className="p-1.5 rounded-lg hover:bg-pearl/10 text-green-400" title="Enregistrer">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRenamingId(null)}
                          className="p-1.5 rounded-lg hover:bg-pearl/10 text-pearl/40" title="Annuler">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="font-inter text-sm font-semibold text-pearl truncate">{pk.friendlyName}</p>
                        <p className="font-inter text-[11px] text-pearl/35 mt-0.5">
                          {pk.backedUp ? 'Synchronisée' : 'Cet appareil'}
                          {pk.lastUsedAt
                            ? ` · utilisée le ${new Date(pk.lastUsedAt).toLocaleDateString('fr')}`
                            : ` · ajoutée le ${new Date(pk.createdAt).toLocaleDateString('fr')}`}
                        </p>
                      </>
                    )}
                  </div>
                  {renamingId !== pk.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setRenamingId(pk.id); setRenameValue(pk.friendlyName) }}
                        className="p-1.5 rounded-lg hover:bg-pearl/10 text-pearl/40 hover:text-pearl transition-colors"
                        title="Renommer">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => revoke(pk.id, pk.friendlyName)}
                        disabled={busy}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-pearl/40 hover:text-danger transition-colors"
                        title="Révoquer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Réauth requise */}
          {pending ? (
            <form onSubmit={doReauth} className="p-3 rounded-xl mb-3"
              style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <p className="font-inter text-xs text-gold/90 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Confirmez votre mot de passe pour {pending.label}.
              </p>
              <div className="flex gap-2">
                <input
                  type="password" className="input-royal flex-1 py-2 text-sm" placeholder="Mot de passe"
                  value={password} onChange={(e) => setPassword(e.target.value)} autoFocus autoComplete="current-password"
                />
                <button type="submit" disabled={busy || !password}
                  className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmer
                </button>
                <button type="button" onClick={() => { setPending(null); setPassword('') }}
                  className="px-3 py-2 rounded-xl text-sm text-pearl/50 hover:text-pearl">Annuler</button>
              </div>
            </form>
          ) : (
            /* Ajouter une passkey */
            <div className="flex gap-2">
              <input
                className="input-royal flex-1 py-2 text-sm"
                placeholder="Nom de l'appareil (optionnel) — ex. iPhone de Doxa"
                value={newName}
                maxLength={60}
                onChange={(e) => setNewName(e.target.value)}
                disabled={busy}
              />
              <button onClick={addPasskey} disabled={busy}
                className="btn-gold-cinematic px-4 py-2 text-sm disabled:opacity-50 inline-flex items-center gap-1.5 flex-shrink-0">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ajouter une passkey
              </button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-[11px] text-danger font-inter mt-3 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
      {notice && !error && <p className="text-[11px] text-green-400 font-inter mt-3 flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> {notice}</p>}
    </div>
  )
}

/**
 * Bouton « Se connecter avec une passkey » (parcours découvrable / usernameless)
 * pour la page de connexion admin. Autonome et réutilisable.
 */
export function PasskeyLoginButton({ onSuccess }: { onSuccess: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [supported, setSupported] = useState(true)

  useEffect(() => { setSupported(!IS_DEMO_MODE && browserSupportsWebAuthn()) }, [])

  async function signIn() {
    setBusy(true); setError('')
    try {
      const optRes = await fetch('/api/admin/passkeys/authenticate/options', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const opt = await optRes.json().catch(() => ({}))
      if (!opt?.ok) { setError(opt?.message || 'Connexion par passkey indisponible.'); return }

      let asseResp
      try {
        asseResp = await startAuthentication({ optionsJSON: opt.options })
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') setError('Connexion annulée.')
        else setError('Aucune passkey disponible sur cet appareil.')
        return
      }

      const vrfRes = await fetch('/api/admin/passkeys/authenticate/verify', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: opt.challengeId, response: asseResp }),
      })
      const vrf = await vrfRes.json().catch(() => ({}))
      if (!vrf?.ok) { setError(vrf?.message || 'Échec de l’authentification.'); return }
      onSuccess()
    } catch { setError('Connexion impossible. Réessayez.') }
    finally { setBusy(false) }
  }

  if (!supported) return null

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-[11px] font-inter text-pearl/30">ou</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>
      <button type="button" onClick={signIn} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-inter font-semibold text-pearl transition-colors disabled:opacity-60"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4 text-gold" />}
        Se connecter avec une passkey
      </button>
      {error && <p className="text-[11px] text-danger font-inter mt-2 text-center">{error}</p>}
    </div>
  )
}

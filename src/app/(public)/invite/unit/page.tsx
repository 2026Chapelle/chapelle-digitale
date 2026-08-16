'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Loader2, Shield } from 'lucide-react'

function InviteUnitInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const token = sp.get('token') || ''
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<{
    unit_name: string | null
    proposed_unit_role: string
    expires_at: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setError('Lien d’invitation invalide.')
      setLoading(false)
      return
    }
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('unit_invite_token', token)
      }
      const r = await fetch(`/api/invite/unit/preview?token=${encodeURIComponent(token)}`, {
        credentials: 'same-origin',
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Invitation indisponible.')
        setPreview(null)
      } else {
        setPreview(j.data)
        setError(null)
      }
    } catch {
      setError('Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function accept() {
    setAccepting(true)
    setError(null)
    try {
      const r = await fetch('/api/invite/unit/accept', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.status === 401) {
        router.push(`/login?next=${encodeURIComponent('/invite/unit')}`)
        return
      }
      if (!r.ok || !j?.ok) {
        setError(j?.message || 'Acceptation impossible.')
        return
      }
      setDone(true)
      try {
        sessionStorage.removeItem('unit_invite_token')
      } catch {
        /* ignore */
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-abyss">
      <div className="w-full max-w-md card-royal p-8 space-y-4">
        <div className="flex items-center gap-2 text-gold text-sm font-inter">
          <Shield className="w-4 h-4" /> Invitation d’accès
        </div>
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gold" />
          </div>
        )}
        {!loading && error && (
          <div className="flex gap-2 text-sm text-danger font-inter">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {!loading && preview && !done && (
          <>
            <h1 className="font-cinzel text-xl text-pearl">Rejoindre une unité</h1>
            <p className="text-sm text-pearl/60 font-inter">
              Unité : <strong className="text-pearl">{preview.unit_name || '—'}</strong>
              <br />
              Rôle proposé : <strong className="text-pearl">{preview.proposed_unit_role}</strong>
              <br />
              Expire : {new Date(preview.expires_at).toLocaleString('fr-FR')}
            </p>
            <button
              type="button"
              disabled={accepting}
              onClick={() => void accept()}
              className="btn-gold-cinematic w-full py-3 text-sm disabled:opacity-50"
            >
              {accepting ? 'Traitement…' : 'Accepter l’invitation'}
            </button>
            <p className="text-[11px] text-pearl/40 font-inter text-center">
              Connectez-vous avec l’email invité.{' '}
              <Link href={`/login?next=${encodeURIComponent('/invite/unit')}`} className="text-gold">
                Connexion
              </Link>
            </p>
          </>
        )}
        {done && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
            <p className="text-sm text-pearl/70 font-inter">Invitation acceptée.</p>
            <Link href="/member/dashboard" className="btn-gold-cinematic inline-flex px-4 py-2 text-sm">
              Continuer
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InviteUnitPage() {
  return (
    <Suspense fallback={null}>
      <InviteUnitInner />
    </Suspense>
  )
}

'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { validateGroupPost, type GroupPostKind } from '@/lib/community/group-space'

type Post = {
  id: string
  author_id: string
  kind: GroupPostKind
  title: string
  body: string
  visibility: 'groupe' | 'responsables'
  state: 'en_attente' | 'publie' | 'refuse' | 'archive'
  resource_url?: string | null
}
type Meeting = {
  id: string
  titre: string
  description?: string | null
  date_reunion: string
  statut: string
  type: string
  lien_visio?: string | null
}
type SpaceData = {
  group: { id: string; nom: string; description: string | null }
  posts: Post[]
  permissions: { manage: boolean }
  viewer_id: string
}
type ViewProps = {
  data: SpaceData | null
  meetings: Meeting[]
  loading: boolean
  error: string | null
  meetingError: string | null
  busy?: boolean
  notice?: string | null
  onAction?: (payload: Record<string, unknown>) => Promise<boolean>
  onReload?: () => void
}

const sections: { kind: GroupPostKind; label: string }[] = [
  { kind: 'priere', label: 'Sujets de prière' },
  { kind: 'annonce', label: 'Annonces' },
  { kind: 'ressource', label: 'Ressources' },
  { kind: 'temoignage', label: 'Témoignages' },
]
const states = {
  en_attente: 'En attente de validation',
  publie: 'Publié',
  refuse: 'Non retenu',
  archive: 'Retiré',
}

function safeUrl(value?: string | null) {
  try {
    const url = new URL(value || '')
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}
function dateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date à confirmer'
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Abidjan', dateStyle: 'full', timeStyle: 'short',
  }).format(date) + ' — heure d’Abidjan'
}

export function GroupSpaceView({
  data, meetings, loading, error, meetingError, busy = false,
  notice, onAction, onReload,
}: ViewProps) {
  const [kind, setKind] = useState<GroupPostKind>('priere')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [confidential, setConfidential] = useState(false)
  const [consent, setConsent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const back = <Link href="/member/dashboard/groupes" className="text-gold underline">Mes groupes</Link>
  if (loading) return <div role="status" className="card-royal p-8">Chargement…</div>
  if (error || !data) return (
    <div className="card-royal p-8 space-y-4">
      <p role="alert">{error || 'Espace indisponible.'}</p>
      {back}
      {onReload && <button className="btn-ghost ml-4" onClick={onReload}>Réessayer</button>}
    </div>
  )

  const manage = data.permissions.manage
  const ordered = meetings.filter((m) => m.statut !== 'annulee')
    .slice().sort((a, b) => Date.parse(a.date_reunion) - Date.parse(b.date_reunion))
  const upcoming = ordered.filter((m) =>
    m.statut === 'planifiee' && Date.parse(m.date_reunion) >= Date.now(),
  )
  const next = upcoming[0]
  const past = ordered.filter((m) => m.statut === 'tenue' ||
    Date.parse(m.date_reunion) < Date.now()).reverse()

  function meetingCard(meeting: Meeting, join: boolean) {
    const href = safeUrl(meeting.lien_visio)
    const google = href && new URL(href).hostname === 'meet.google.com'
    return (
      <article key={meeting.id} className="rounded-2xl border border-white/10 p-5 space-y-3">
        <h3 className="font-cinzel font-bold">{meeting.titre}</h3>
        <p className="text-sm text-pearl/70">{dateLabel(meeting.date_reunion)}</p>
        {meeting.description && <p className="whitespace-pre-wrap text-sm">{meeting.description}</p>}
        {join && (href
          ? <a href={href} target="_blank" rel="noopener noreferrer" className="btn-gold inline-flex">
              {google ? 'Rejoindre sur Google Meet' : 'Rejoindre la rencontre'}
            </a>
          : <p className="text-sm text-pearl/60">Lien de rencontre indisponible</p>)}
      </article>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setFormError(null)
    const payload = {
      kind, title, body,
      visibility: kind === 'priere' && confidential ? 'responsables' : 'groupe',
      consent: kind === 'temoignage' && consent,
      resource_url: kind === 'ressource' ? url : null,
    }
    const result = validateGroupPost(payload)
    if (!result.ok) { setFormError(result.errors.join(' ')); return }
    if (onAction && await onAction({ action: 'create', ...result.value })) {
      setTitle(''); setBody(''); setUrl(''); setConsent(false); setConfidential(false)
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        {back}
        <p className="section-label">Mahanaïm · Espace privé du groupe</p>
        <h1 className="font-cinzel text-3xl md:text-4xl font-bold">{data.group.nom}</h1>
        {data.group.description && <p className="text-pearl/70 whitespace-pre-wrap">{data.group.description}</p>}
        <nav aria-label="Rubriques du groupe" className="flex flex-wrap gap-3">
          <a href="#rencontres" className="btn-ghost">Rencontres</a>
          {sections.map((s) => <a key={s.kind} href={`#${s.kind}`} className="btn-ghost">{s.label}</a>)}
        </nav>
      </header>

      {notice && <p role="status" className="rounded-xl border border-gold/30 p-4">{notice}</p>}

      <section id="rencontres" className="card-royal p-5 md:p-8 space-y-4">
        <h2 className="font-cinzel text-2xl font-bold">Rencontres</h2>
        {meetingError ? (
          <div><p role="alert">{meetingError}</p>
            {onReload && <button onClick={onReload} className="btn-ghost mt-3">Réessayer</button>}
          </div>
        ) : <>
          <h3 className="text-gold font-semibold">Prochaine rencontre</h3>
          {next ? meetingCard(next, true) : <p>Aucune rencontre programmée pour le moment.</p>}
          {upcoming.slice(1).map((m) => meetingCard(m, true))}
          {past.length > 0 && <details>
            <summary className="cursor-pointer py-3">Rencontres précédentes</summary>
            <div className="space-y-3">{past.map((m) => meetingCard(m, false))}</div>
          </details>}
        </>}
        {manage && <Link href="/member/dashboard/reunions" className="text-gold underline">
          Programmer et gérer les rencontres
        </Link>}
      </section>

      <section className="card-royal p-5 md:p-8">
        <h2 className="font-cinzel text-xl font-bold mb-4">
          {manage ? 'Publier un contenu' : 'Proposer une prière ou un témoignage'}
        </h2>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">Type de contenu
            <select className="input-royal w-full mt-2" value={kind}
              onChange={(e) => { setKind(e.target.value as GroupPostKind); setFormError(null) }}>
              {sections.filter((s) => manage || s.kind === 'priere' || s.kind === 'temoignage')
                .map((s) => <option key={s.kind} value={s.kind}>{s.label}</option>)}
            </select>
          </label>
          <label className="block">Titre
            <input className="input-royal w-full mt-2" required maxLength={160}
              value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">Texte
            <textarea className="input-royal w-full mt-2" rows={5} required maxLength={10000}
              value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          {kind === 'priere' && <label className="flex items-start gap-3">
            <input type="checkbox" checked={confidential}
              onChange={(e) => setConfidential(e.target.checked)} className="mt-1" />
            <span>Confidentiel : visible uniquement par moi et les responsables.
              La validation ne rendra pas ce sujet visible au groupe.</span>
          </label>}
          {kind === 'temoignage' && <label className="flex items-start gap-3">
            <input type="checkbox" required checked={consent}
              onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>J’accepte le partage de ce témoignage avec les membres du groupe.
              J’ai l’accord des personnes identifiables qui y sont mentionnées.</span>
          </label>}
          {kind === 'ressource' && <label className="block">Lien HTTPS de la ressource, facultatif
            <input className="input-royal w-full mt-2" type="url" maxLength={2048}
              value={url} onChange={(e) => setUrl(e.target.value)} />
            <span className="block text-sm text-pearl/60 mt-2">
              Un fichier hébergé publiquement reste accessible par son lien.
            </span>
          </label>}
          {!manage && <p className="text-sm text-pearl/60">Votre proposition sera examinée par les responsables.</p>}
          {formError && <p role="alert" className="text-red-300">{formError}</p>}
          <button type="submit" disabled={busy || !onAction} className="btn-gold disabled:opacity-50">
            {busy ? 'Enregistrement…' : manage ? 'Publier' : 'Envoyer ma proposition'}
          </button>
        </form>
      </section>

      {sections.map((section) => {
        const posts = data.posts.filter((p) => p.kind === section.kind && p.state !== 'archive')
        return (
          <section key={section.kind} id={section.kind} className="card-royal p-5 md:p-8 space-y-4">
            <h2 className="font-cinzel text-2xl font-bold">{section.label}</h2>
            {!posts.length && <p className="text-pearl/60">Aucun contenu pour le moment.</p>}
            {posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-white/10 p-5 space-y-3">
                <div className="flex flex-wrap gap-2 text-xs text-gold">
                  <span>{states[post.state]}</span>
                  {post.visibility === 'responsables' &&
                    <span>Confidentiel — auteur et responsables uniquement</span>}
                  {post.author_id === data.viewer_id && <span>Votre publication</span>}
                </div>
                <h3 className="font-semibold text-lg">{post.title}</h3>
                <p className="whitespace-pre-wrap break-words">{post.body}</p>
                {safeUrl(post.resource_url) && <a href={safeUrl(post.resource_url)!}
                  target="_blank" rel="noopener noreferrer" className="text-gold underline">
                  Ouvrir la ressource
                </a>}
                <div className="flex flex-wrap gap-3">
                  {manage && post.state === 'en_attente' &&
                    (['publie', 'refuse'] as const).map((decision) => (
                      <button key={decision} className="btn-ghost" disabled={busy}
                        onClick={() => onAction?.({ action: 'moderate', post_id: post.id, decision })}>
                        {decision === 'publie' ? 'Valider' : 'Ne pas retenir'}
                      </button>
                    ))}
                  {manage && post.state !== 'en_attente' &&
                    <button className="btn-ghost" disabled={busy}
                      onClick={() => onAction?.({ action: 'moderate', post_id: post.id, decision: 'archive' })}>
                      Archiver
                    </button>}
                  {post.author_id === data.viewer_id &&
                    <button className="btn-ghost" disabled={busy}
                      onClick={() => onAction?.({ action: 'withdraw', post_id: post.id })}>
                      Retirer ma publication
                    </button>}
                </div>
              </article>
            ))}
          </section>
        )
      })}
    </div>
  )
}

export default function GroupSpace({ groupId }: { groupId: string }) {
  const [data, setData] = useState<SpaceData | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meetingError, setMeetingError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(null); setData(null); setMeetings([]); setMeetingError(null)
    try {
      const response = await fetch(`/api/member/groupes/${encodeURIComponent(groupId)}/espace`, {
        credentials: 'same-origin', cache: 'no-store', signal,
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.message || 'Espace indisponible.')
      if (signal?.aborted) return
      setData(result.data)
      try {
        const meetingResponse = await fetch(
          `/api/member/reunions?groupe_id=${encodeURIComponent(groupId)}`,
          { credentials: 'same-origin', cache: 'no-store', signal },
        )
        if (meetingResponse.status === 401 || meetingResponse.status === 403) {
          if (!signal?.aborted) {
            setData(null)
            setMeetings([])
            setError('Acces au groupe refuse ou expire. Actualisez la page.')
          }
          return
        }
        const meetingResult = await meetingResponse.json()
        if (!meetingResponse.ok || !meetingResult.ok) {
          if (!signal?.aborted) setMeetingError('Rencontres indisponibles. Réessayez.')
        } else if (!signal?.aborted) setMeetings(meetingResult.data || [])
      } catch (err) {
        if (!signal?.aborted) {
          setMeetingError(err instanceof Error ? err.message : 'Rencontres indisponibles.')
        }
      }
    } catch (err) {
      if (!signal?.aborted) {
        setData(null)
        setError(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.')
      }
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [groupId])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function action(payload: Record<string, unknown>) {
    if (busy) return false
    setBusy(true); setNotice(null)
    try {
      const response = await fetch(`/api/member/groupes/${encodeURIComponent(groupId)}/espace`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) {
        if (response.status === 401 || response.status === 403) {
          setData(null); setMeetings([]); setError(result.message || 'Accès refusé.')
        }
        throw new Error(result.message || 'Enregistrement impossible.')
      }
      setNotice('Votre demande a été enregistrée.')
      await load()
      return true
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.')
      return false
    } finally { setBusy(false) }
  }

  return <GroupSpaceView data={data} meetings={meetings} loading={loading}
    error={error} meetingError={meetingError} busy={busy} notice={notice}
    onAction={action} onReload={() => { void load() }} />
}
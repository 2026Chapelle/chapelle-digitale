'use client'
/**
 * Espace membre — Détail d'une prière (V2.3-B Lot 2).
 * Lit le contenu complet via /api/member/prayers/[id] (route protégée, session serveur).
 * 404 propre si introuvable. Aucun PDF généré (mention « bientôt disponible »).
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Loader2, ArrowLeft, Clock, Sparkles, ListChecks, Compass, FileText, Download, BookOpen } from 'lucide-react'

interface MemberPrayer {
  id: string
  title: string
  category: string
  summary: string
  content: string
  coverIcon: string
  color: string
  durationMinutes: number
  level: string
  intention: string
  recommendedMoment: string
  guideSteps: string[]
  takeaway: string
  imageUrl?: string
  imageAlt?: string
  overlayTone?: string
  hasPdf?: boolean
}

export default function PrayerDetailPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [prayer, setPrayer] = useState<MemberPrayer | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dlMsg, setDlMsg] = useState<string | null>(null)

  async function download() {
    setDlMsg(null)
    try {
      const r = await fetch(`/api/member/prayers/${encodeURIComponent(id)}/download`, { credentials: 'same-origin' })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.ok && j.data?.url) window.open(j.data.url, '_blank', 'noopener')
      else setDlMsg(j?.message || 'Le support PDF sera bientôt disponible.')
    } catch { setDlMsg('Téléchargement impossible. Réessayez.') }
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/member/prayers/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
        if (cancelled) return
        if (r.status === 404) { setNotFound(true); setLoading(false); return }
        const j = await r.json().catch(() => ({}))
        if (!r.ok || j?.ok !== true) { setError('Impossible de charger cette prière. Réessayez.') }
        else setPrayer(j.data?.prayer || null)
      } catch { if (!cancelled) setError('Impossible de charger cette prière. Réessayez.') }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  const back = (
    <Link href="/member/dashboard/prieres/bibliotheque" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-4 transition-colors">
      <ArrowLeft className="w-4 h-4" /> Bibliothèque de Prières
    </Link>
  )

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal max-w-3xl">
        {back}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : notFound ? (
          <div className="card-royal text-center py-16">
            <p className="font-cinzel text-lg text-pearl/60 mb-4">Cette prière est introuvable.</p>
            <Link href="/member/dashboard/prieres/bibliotheque" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2">Retour à la bibliothèque</Link>
          </div>
        ) : error ? (
          <div className="card-royal p-3 text-sm text-danger font-inter">{error}</div>
        ) : prayer ? (
          <>
            {prayer.imageUrl && (
              <div className="relative mb-5 h-44 rounded-2xl bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${prayer.imageUrl})` }} role="img" aria-label={prayer.imageAlt || prayer.title}>
                <div className="absolute inset-0" style={{ background: prayer.overlayTone === 'dark' ? 'linear-gradient(180deg, rgba(12,10,22,0.2), rgba(12,10,22,0.85))' : 'linear-gradient(180deg, rgba(12,10,22,0.1), rgba(12,10,22,0.8))' }} />
                <span className="absolute bottom-3 left-4 font-inter text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${prayer.color}33`, color: '#F5E6D8', backdropFilter: 'blur(4px)' }}>{prayer.category}</span>
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${prayer.color}18`, border: `1px solid ${prayer.color}30` }}>
                <BookOpen className="w-6 h-6" aria-hidden style={{ color: prayer.color }} />
              </div>
              <div>
                <h1 className="font-cinzel text-2xl font-black text-pearl">{prayer.title}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="font-inter text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${prayer.color}18`, color: prayer.color }}>{prayer.category}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-inter text-pearl/45"><Clock className="w-3 h-3" /> {prayer.durationMinutes} min</span>
                  <span className="text-[11px] font-inter text-pearl/45">· {prayer.level}</span>
                </div>
              </div>
            </div>

            <p className="font-inter text-sm text-pearl/55 mb-6">{prayer.intention} · <span className="text-pearl/40">{prayer.recommendedMoment}</span></p>

            {/* Contenu complet */}
            <div className="card-royal p-6 mb-6">
              <p className="font-inter text-[15px] leading-loose text-pearl/85 whitespace-pre-line">{prayer.content}</p>
            </div>

            {/* Comment prier avec ce guide */}
            {prayer.guideSteps?.length > 0 && (
              <div className="card-royal p-6 mb-6">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-4"><Compass className="w-4 h-4 text-gold" /> Comment prier avec ce guide</h2>
                <ol className="space-y-3">
                  {prayer.guideSteps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{ background: `${prayer.color}22`, color: prayer.color }}>{i + 1}</span>
                      <span className="font-inter text-sm text-pearl/75 leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* À retenir */}
            {prayer.takeaway && (
              <div className="card-royal p-5 mb-6 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-1"><ListChecks className="w-4 h-4 text-gold" /> À retenir</h2>
                  <p className="font-inter text-sm text-pearl/70 leading-relaxed">{prayer.takeaway}</p>
                </div>
              </div>
            )}

            {prayer.hasPdf ? (
              <button onClick={download} className="btn-gold text-xs px-4 py-2 inline-flex items-center gap-2"><Download className="w-3.5 h-3.5" /> Télécharger le PDF</button>
            ) : (
              <div className="inline-flex items-center gap-2 text-[11px] font-inter text-pearl/35"><FileText className="w-3.5 h-3.5" /> Le support PDF sera bientôt disponible.</div>
            )}
            {dlMsg && <p className="text-[11px] text-pearl/40 font-inter mt-2">{dlMsg}</p>}
          </>
        ) : null}
      </div>
    </div>
  )
}

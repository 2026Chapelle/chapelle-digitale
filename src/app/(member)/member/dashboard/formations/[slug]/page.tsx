'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Clock, Award, CheckCircle, Lock, BookOpen, Loader2, FileText, PlayCircle, Check, Trophy, Download, Send, HelpCircle } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ModuleVideoPlayer } from '@/components/features/member/ModuleVideoPlayer'
import { WATCH_THRESHOLD, remainingToWatch } from '@/lib/formations/video-validation'

interface Module {
  id: string; ordre: number; titre: string; description?: string; type: string
  youtube_id?: string; video_url?: string; pdf_url?: string; contenu_texte?: string
  duree_minutes: number; acces_min_statut: string
  completed: boolean; locked: boolean; lock_reason?: string | null
  has_video?: boolean; has_pdf?: boolean; pdf_locked?: boolean
  video_percent?: number; video_last_position?: number
}

export default function FormationDetailPage({ params }: { params: { slug: string } }) {
  const { isDemo, user, profile } = useAuth()
  const [formation, setFormation] = useState<any>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [progress, setProgress] = useState({ total: 0, completed: 0, progression: 0 })
  const [active, setActive] = useState<Module | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [certificatUrl, setCertificatUrl] = useState<string | null>(null)
  // Inscription + verrou inter-parcours (P1 → P2 → P3)
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [parcoursLocked, setParcoursLocked] = useState(false)
  const [previousFormation, setPreviousFormation] = useState<{ slug: string; titre: string } | null>(null)
  const [nextFormation, setNextFormation] = useState<{ slug: string; titre: string; statut: string } | null>(null)
  const [enrolling, setEnrolling] = useState(false)
  const [watchPct, setWatchPct] = useState(0)
  const [question, setQuestion] = useState('')
  const [qSending, setQSending] = useState(false)
  const [qSent, setQSent] = useState(false)
  const [questions, setQuestions] = useState<Array<{ id: string; question: string; reponse: string | null; statut: string; auteur: string | null; user_id: string | null; created_at: string }>>([])

  const loadQuestions = useCallback(async (formationId: string) => {
    try {
      const r = await fetch(`/api/member/formations/${formationId}/questions`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) setQuestions(j.questions || [])
    } catch { /* vide */ }
  }, [])

  const loadModules = useCallback(async (formationId: string) => {
    try {
      const r = await fetch(`/api/member/formations/${formationId}/modules`, { credentials: 'same-origin' })
      const j = await r.json()
      if (j.ok) {
        setModules(j.data.modules)
        setProgress({ total: j.data.total, completed: j.data.completed, progression: j.data.progression })
        setActive((prev) => prev ?? j.data.modules.find((m: Module) => !m.locked) ?? j.data.modules[0] ?? null)
        setEnrolled(!!j.data.enrolled)
        setParcoursLocked(!!j.data.parcours_locked)
        setPreviousFormation(j.data.previous_formation || null)
        setNextFormation(j.data.next_formation || null)
      }
    } catch { /* vide */ }
  }, [])

  useEffect(() => {
    if (isDemo || IS_DEMO_MODE) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const { data: f } = await supabase.from('formations').select('*').eq('slug', params.slug).maybeSingle()
        if (cancelled) return
        if (!f) { setNotFound(true); setLoading(false); return }
        setFormation(f)
        await loadModules(f.id)
        loadQuestions(f.id)
      } catch { setNotFound(true) }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [params.slug, isDemo, loadModules, loadQuestions])

  async function markComplete(m: Module) {
    if (!formation || m.completed) return
    try {
      const r = await fetch('/api/member/formations/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ module_id: m.id, formation_id: formation.id }),
      })
      const j = await r.json()
      if (j.ok) {
        toast.success(j.data.progression >= 100 ? '🎓 Félicitations ! Vous avez terminé cette formation.' : '✅ Bravo, module terminé — continuez sur votre lancée !')
        if (j.data.integration_certificate) toast.success('🏅 Certificat d\'Intégration CIER délivré !')
        await loadModules(formation.id)
      } else toast.error(j.message || 'Échec')
    } catch { toast.error('Erreur réseau') }
  }

  // Inscription au parcours (entrée explicite, refusée côté serveur si verrouillé).
  async function enrollSelf() {
    if (!formation) return
    setEnrolling(true)
    try {
      const r = await fetch('/api/member/formations/enroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ formation_id: formation.id }),
      })
      const j = await r.json()
      if (j.ok) { toast.success('Inscription confirmée ✓'); await loadModules(formation.id) }
      else toast.error(j.message || 'Inscription impossible')
    } catch { toast.error('Erreur réseau') }
    setEnrolling(false)
  }

  // Certificat réel de la formation (si une URL PDF a été générée).
  useEffect(() => {
    if (isDemo || IS_DEMO_MODE || !formation || !user?.id || progress.progression < 100) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('inscriptions_formation')
          .select('certificat_url').eq('formation_id', formation.id).eq('user_id', user.id).maybeSingle()
        if (!cancelled && data?.certificat_url) setCertificatUrl(data.certificat_url)
      } catch { /* pas de PDF */ }
    })()
    return () => { cancelled = true }
  }, [formation, user, isDemo, progress.progression])

  // Traçabilité : ouverture d'un module = visionnage vidéo / consultation PDF (réel).
  useEffect(() => {
    if (!active || !formation || isDemo || IS_DEMO_MODE) return
    const isPdf = active.type === 'pdf'
    try {
      fetch('/api/activity', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          action_type: isPdf ? 'pdf_download' : 'video_view',
          resource_type: isPdf ? 'pdf' : 'video',
          resource_id: active.id, resource_title: `${formation.titre} — ${active.titre}`,
          source: 'formation', metadata: { module_id: active.id, formation_id: formation.id },
        }),
      })
    } catch { /* non bloquant */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  async function submitQuestion() {
    if (!question.trim() || !formation) return
    setQSending(true)
    try {
      const auteur = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || (user?.email ?? 'Membre') : (user?.email ?? 'Membre')
      const r = await fetch(`/api/member/formations/${formation.id}/questions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ question: question.trim(), auteur, email: profile?.email ?? user?.email ?? '' }),
      })
      const j = await r.json()
      if (!j.ok) { toast.error(j.message || "Échec de l'envoi."); setQSending(false); return }
      setQSent(true); setQuestion(''); toast.success('Question envoyée — un encadrant vous répondra 🙏')
      loadQuestions(formation.id)
    } catch { toast.error('Erreur réseau') }
    setQSending(false)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-abyss"><Loader2 className="w-6 h-6 animate-spin text-gold" /></div>
  }
  if (isDemo || IS_DEMO_MODE) {
    return <Centered title="Espace formation" text="Connectez-vous pour accéder à votre parcours de formation." />
  }
  if (notFound || !formation) {
    return <Centered title="Formation introuvable" text="Cette formation n'existe pas ou n'est pas encore publiée." back />
  }

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal">
        <Link href="/member/dashboard/formations" className="inline-flex items-center gap-2 text-pearl/40 hover:text-gold text-sm font-inter mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Mes formations
        </Link>

        <div className="card-royal mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="font-cinzel text-xl font-black text-pearl mb-1">{formation.titre}</h1>
              <p className="text-pearl/50 text-sm font-inter max-w-2xl">{formation.description || formation.contenu_court}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-pearl/40 font-inter">
                {formation.instructeur_nom && <span>par {formation.instructeur_nom}</span>}
                {formation.niveau && <span className="capitalize">· {formation.niveau}</span>}
                {formation.certifiant && <span className="inline-flex items-center gap-1 text-gold"><Award className="w-3 h-3" /> Certifiant</span>}
              </div>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="font-cinzel font-black text-3xl text-gold">{progress.progression}%</div>
              <div className="text-pearl/35 text-[11px] font-inter">{progress.completed}/{progress.total} modules</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden mt-4">
            <div className="h-full rounded-full" style={{ width: `${progress.progression}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
          </div>
        </div>

        {/* Félicitations + certificat (formation terminée) */}
        {progress.total > 0 && progress.progression >= 100 && (
          <div className="card-royal mb-6 text-center" style={{ borderColor: 'rgba(212,175,55,0.3)', background: 'linear-gradient(135deg, rgba(212,175,55,0.08), rgba(75,0,130,0.08))' }}>
            <Trophy className="w-9 h-9 mx-auto mb-3 text-gold" />
            <h2 className="font-cinzel text-lg font-black text-pearl mb-1">Félicitations ! 🎉</h2>
            <p className="font-inter text-sm text-pearl/55 mb-4 max-w-md mx-auto">
              Vous avez terminé « {formation.titre} ». Que Dieu affermisse en vous ce que vous avez appris.
            </p>
            {formation.certifiant && (
              certificatUrl
                ? <a href={certificatUrl} target="_blank" rel="noreferrer" className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2"><Download className="w-4 h-4" /> Télécharger mon certificat</a>
                : <span className="inline-flex items-center gap-2 text-xs font-inter text-pearl/50 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}><Award className="w-4 h-4 text-gold/60" /> Certificat disponible prochainement</span>
            )}

            {/* Parcours suivant de la séquence d'intégration */}
            {nextFormation && (
              <div className="mt-5 pt-5 border-t border-white/5">
                {nextFormation.statut === 'publie' ? (
                  <Link href={`/member/dashboard/formations/${nextFormation.slug}`}
                    className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2">
                    Continuer vers « {nextFormation.titre} » <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 text-xs font-inter text-pearl/50 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}>
                    <Clock className="w-4 h-4 text-gold/60" /> Parcours suivant (« {nextFormation.titre} ») bientôt disponible
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {parcoursLocked ? (
          /* Verrou inter-parcours : parcours précédent non terminé */
          <div className="card-royal text-center py-16" style={{ borderColor: 'rgba(212,175,55,0.3)' }}>
            <Lock className="w-8 h-8 mx-auto mb-3 text-gold/60" />
            <p className="font-cinzel text-pearl/80 text-lg mb-1">Parcours verrouillé</p>
            <p className="font-inter text-sm text-pearl/50 mb-5 max-w-md mx-auto">
              Terminez d&apos;abord {previousFormation ? `« ${previousFormation.titre} »` : 'le parcours précédent'} pour débloquer celui-ci.
            </p>
            {previousFormation && (
              <Link href={`/member/dashboard/formations/${previousFormation.slug}`} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Aller au parcours précédent
              </Link>
            )}
          </div>
        ) : enrolled === false ? (
          /* Inscription obligatoire avant tout accès au contenu */
          <div className="card-royal text-center py-16" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-gold/60" />
            <p className="font-cinzel text-pearl/80 text-lg mb-1">Rejoignez ce parcours</p>
            <p className="font-inter text-sm text-pearl/50 mb-5 max-w-md mx-auto">
              Inscrivez-vous pour accéder aux modules et suivre votre progression.
            </p>
            <button onClick={enrollSelf} disabled={enrolling} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
              {enrolling ? <><Loader2 className="w-4 h-4 animate-spin" /> Inscription…</> : <><Check className="w-4 h-4" /> S&apos;inscrire à cette formation</>}
            </button>
          </div>
        ) : modules.length === 0 ? (
          <div className="card-royal text-center py-16">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-gold/40" />
            <p className="font-inter text-sm text-pearl/50">Aucun module disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {active && (active.locked ? (
                <div className="card-royal text-center py-16">
                  <Lock className="w-8 h-8 mx-auto mb-3 text-gold/50" />
                  <p className="font-cinzel text-pearl/60">Module verrouillé</p>
                  <p className="font-inter text-xs text-pearl/35 mt-1">
                    {active.lock_reason === 'prerequis' ? 'Terminez le module précédent pour débloquer celui-ci.' : `Accès réservé (statut requis : ${active.acces_min_statut}).`}
                  </p>
                </div>
              ) : !active.has_video ? (
                /* Module en préparation : aucune vidéo → pas de validation, pas de PDF */
                <div className="card-royal">
                  <h2 className="font-cinzel font-bold text-pearl text-base mb-3">{active.titre}</h2>
                  <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center text-center px-6 mb-4" style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.02)' }}>
                    <Clock className="w-8 h-8 text-gold/50 mb-3" />
                    <p className="font-cinzel text-pearl/80">Vidéo bientôt disponible</p>
                    <p className="font-inter text-xs text-pearl/40 mt-1">Ce module est en préparation.</p>
                  </div>
                  {active.description && <p className="text-pearl/60 text-sm font-inter whitespace-pre-wrap mb-3">{active.description}</p>}
                  <div className="pt-3 border-t border-white/5">
                    <button disabled className="btn-royal text-sm px-5 py-2.5 inline-flex items-center gap-2 opacity-60 cursor-not-allowed">
                      <Clock className="w-4 h-4" /> Module en préparation
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <ModuleVideoPlayer
                    key={active.id}
                    moduleId={active.id}
                    formationId={formation.id}
                    youtubeId={active.youtube_id}
                    videoUrl={active.video_url}
                    initialPosition={active.video_last_position || 0}
                    initialPercent={active.video_percent || 0}
                    completed={active.completed}
                    onPercent={setWatchPct}
                  />
                  <div className="card-royal">
                    <h2 className="font-cinzel font-bold text-pearl text-base mb-1">{active.titre}</h2>
                    {active.duree_minutes > 0 && <p className="text-xs text-pearl/40 font-inter mb-3 inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {active.duree_minutes} min</p>}
                    {active.description && <p className="text-pearl/60 text-sm font-inter whitespace-pre-wrap mb-3">{active.description}</p>}
                    {active.contenu_texte && <div className="max-w-none text-pearl/70 text-sm font-inter whitespace-pre-wrap mb-3">{active.contenu_texte}</div>}

                    {/* PDF : déverrouillé UNIQUEMENT après validation du module (≥ 90 %) */}
                    {active.pdf_url ? (
                      <a href={active.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-gold/80 hover:text-gold text-sm font-inter mb-4"><FileText className="w-4 h-4" /> Télécharger le PDF du module</a>
                    ) : active.pdf_locked ? (
                      <div className="inline-flex items-center gap-2 text-pearl/40 text-sm font-inter mb-4"><Lock className="w-4 h-4" /> Complétez la vidéo pour débloquer cette ressource.</div>
                    ) : null}

                    {/* Validation par visionnage RÉEL ≥ 90 % */}
                    <div className="pt-3 border-t border-white/5">
                      {!active.completed && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-pearl/45 mb-1 font-inter">
                            <span>Visionnage</span><span>{Math.min(100, Math.round(watchPct))}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, watchPct)}%`, background: watchPct >= WATCH_THRESHOLD ? '#22C55E' : 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
                          </div>
                          {watchPct < WATCH_THRESHOLD && (
                            <p className="text-[11px] text-pearl/40 font-inter mt-1.5">Regardez encore {remainingToWatch(watchPct)}% de la vidéo pour débloquer la validation.</p>
                          )}
                        </div>
                      )}
                      <button onClick={() => markComplete(active)} disabled={active.completed || watchPct < WATCH_THRESHOLD}
                        className={(active.completed ? 'btn-royal' : 'btn-gold') + ' text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}>
                        {active.completed ? <><Check className="w-4 h-4" /> Terminé</> : <><CheckCircle className="w-4 h-4" /> Marquer terminé</>}
                      </button>
                    </div>
                  </div>
                </>
              ))}

              {/* Poser une question (table dédiée formation_questions + notif formateur) */}
              <div className="card-royal">
                <h3 className="font-cinzel font-bold text-pearl text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-gold" /> Poser une question</h3>
                {qSent ? (
                  <p className="font-inter text-sm text-green-400/90 mb-4">Votre question a été envoyée. Un encadrant vous répondra. 🙏</p>
                ) : (
                  <div className="mb-4">
                    <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3}
                      placeholder="Une question sur ce cours ? Écrivez-la ici…"
                      className="input-royal w-full resize-none mb-3" />
                    <button onClick={submitQuestion} disabled={qSending || !question.trim()}
                      className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-2 disabled:opacity-50">
                      {qSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <><Send className="w-4 h-4" /> Envoyer ma question</>}
                    </button>
                  </div>
                )}

                {/* Historique Q&A : mes questions + questions publiques répondues */}
                {questions.length > 0 && (
                  <div className="space-y-3 border-t border-white/5 pt-4">
                    {questions.map((q) => (
                      <div key={q.id} className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
                        <p className="font-inter text-sm text-pearl/75 flex items-start gap-2">
                          <HelpCircle className="w-3.5 h-3.5 text-gold/70 flex-shrink-0 mt-0.5" /> {q.question}
                        </p>
                        {q.reponse ? (
                          <p className="font-inter text-sm text-pearl/60 mt-2 pl-5 border-l-2 border-gold/30">{q.reponse}</p>
                        ) : (
                          <p className="font-inter text-[11px] text-amber-400/70 mt-1.5 pl-5">En attente de réponse…</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card-royal h-fit">
              <h3 className="font-cinzel font-bold text-pearl text-sm mb-4">Modules ({progress.total})</h3>
              <div className="space-y-1.5">
                {modules.map((m) => (
                  <button key={m.id} onClick={() => setActive(m)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{ background: active?.id === m.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${active?.id === m.id ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: m.completed ? 'rgba(34,197,94,0.15)' : m.locked ? 'rgba(255,255,255,0.04)' : 'rgba(212,175,55,0.12)' }}>
                      {m.completed ? <CheckCircle className="w-4 h-4 text-green-400" /> : m.locked ? <Lock className="w-3.5 h-3.5 text-pearl/30" /> : <PlayCircle className="w-4 h-4 text-gold" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-inter truncate ${m.locked ? 'text-pearl/30' : 'text-pearl/80'}`}>{m.ordre}. {m.titre}</p>
                      {m.duree_minutes > 0 && <p className="text-[10px] text-pearl/30 font-inter">{m.duree_minutes} min</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Centered({ title, text, back }: { title: string; text: string; back?: boolean }) {
  return (
    <div className="min-h-screen bg-abyss flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h1 className="font-cinzel text-xl font-bold text-pearl mb-2">{title}</h1>
        <p className="text-pearl/50 font-inter text-sm mb-5">{text}</p>
        {back && <Link href="/member/dashboard/formations" className="btn-gold-cinematic px-5 py-2.5 text-sm">Mes formations</Link>}
      </div>
    </div>
  )
}

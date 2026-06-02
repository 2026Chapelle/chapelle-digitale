'use client'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2, ShieldCheck, HeartHandshake, Sparkles, Play, FileText, BookOpen,
  ChevronDown, Send, CheckCircle, Compass, Lock,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useAuth } from '@/components/providers/AuthProvider'
import toast from 'react-hot-toast'

interface Ressource { id: string; type: string; titre: string; description?: string; url?: string; contenu?: string; categorie?: string; duree_minutes?: number }
interface Demande { id: string; sujet: string; statut: string; niveau?: string; parcours_recommande?: string; created_at: string }

const QUESTIONS = [
  'Je ressens un poids ou une oppression intérieure.',
  'Des blessures du passé affectent encore mon présent.',
  'Des pensées négatives reviennent malgré moi.',
  'Je ressens une distance avec Dieu.',
  'Les mêmes schémas se répètent malgré mes efforts.',
  'Je manque de paix intérieure.',
]
const ECHELLE = [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 2, l: 'Souvent' }, { v: 3, l: 'Toujours' }]

const STATUT_LABEL: Record<string, string> = {
  recu: 'Reçu', en_attente: 'En attente', en_traitement: 'En traitement', suivi: 'Suivi pastoral', cloture: 'Clôturé',
}

function diagnostiquer(score: number) {
  if (score <= 5) return { niveau: 'leger', parcours: 'Parcours « Paix intérieure »', texte: 'Une marche de consolidation dans la paix de Dieu.' }
  if (score <= 11) return { niveau: 'modere', parcours: 'Parcours « Guérison intérieure »', texte: 'Un cheminement de guérison des blessures et de restauration.' }
  return { niveau: 'profond', parcours: 'Parcours « Restauration & délivrance »', texte: 'Un accompagnement pastoral personnalisé est vivement recommandé.' }
}

export default function DelivrancePage() {
  const { user, profile, isDemo } = useAuth()
  const [ressources, setRessources] = useState<Ressource[]>([])
  const [demande, setDemande] = useState<Demande | null>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<number[]>(Array(QUESTIONS.length).fill(-1))
  const [result, setResult] = useState<ReturnType<typeof diagnostiquer> | null>(null)
  const [openRes, setOpenRes] = useState<string | null>(null)
  const [sujet, setSujet] = useState('')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (isDemo) { setLoading(false); return }
    ;(async () => {
      try {
        const r = await fetch('/api/member/delivrance', { credentials: 'same-origin' })
        const j = await r.json()
        if (j.ok) { setRessources(j.ressources || []); setDemande(j.demande || null) }
      } catch { /* */ }
      setLoading(false)
    })()
  }, [isDemo])

  const score = useMemo(() => answers.reduce((s, a) => s + (a > 0 ? a : 0), 0), [answers])
  const allAnswered = answers.every((a) => a >= 0)

  async function submitDiagnostic() {
    const res = diagnostiquer(score)
    setResult(res)
    try {
      await fetch('/api/member/delivrance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          sujet: 'Diagnostic spirituel',
          diagnostic: { reponses: answers, score },
          niveau: res.niveau, parcours_recommande: res.parcours,
          prenom: profile?.prenom, email: profile?.email ?? user?.email,
        }),
      })
      toast.success('Diagnostic enregistré 🕊️')
    } catch { /* */ }
  }

  async function submitAccompagnement() {
    if (!description.trim()) { toast.error('Décrivez brièvement votre besoin.'); return }
    setSending(true)
    try {
      const r = await fetch('/api/member/delivrance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({
          sujet: sujet.trim() || 'Demande d\'accompagnement', description: description.trim(),
          niveau: result?.niveau, parcours_recommande: result?.parcours, accompagnement: true,
          prenom: profile?.prenom, email: profile?.email ?? user?.email,
        }),
      })
      const j = await r.json()
      if (!j.ok) { toast.error('Échec de l\'envoi.'); setSending(false); return }
      setSent(true); setDescription(''); setSujet('')
      toast.success('Votre demande confidentielle a été transmise 🙏')
    } catch { toast.error('Erreur réseau') }
    setSending(false)
  }

  if (isDemo) {
    return <div className="min-h-screen bg-abyss pt-24 pb-16"><div className="container-royal"><PageHeader eyebrow="Espace Membre" title="Cure d'âme" description="Connectez-vous pour accéder au Centre de délivrance et de cure d'âme." /></div></div>
  }

  const prieres = ressources.filter((r) => r.type === 'priere' || r.type === 'texte')
  const medias = ressources.filter((r) => ['video', 'audio'].includes(r.type))
  const pdfs = ressources.filter((r) => r.type === 'pdf')

  return (
    <div className="min-h-screen bg-abyss pt-24 pb-16">
      <div className="container-royal space-y-6">
        <PageHeader
          eyebrow="Restauration & guérison intérieure"
          title={<>Centre de <span className="text-cinematic-gold">Délivrance</span> & Cure d&apos;âme</>}
          description="Un espace pastoral confidentiel pour votre processus de restauration."
        />

        {/* Confidentialité */}
        <div className="card-royal flex items-start gap-3" style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="font-inter text-sm text-pearl/60">
            <strong className="text-pearl/80">Confidentialité absolue.</strong> Vos réponses et demandes ne sont visibles que par vous et l&apos;équipe pastorale. Rien n&apos;est jamais rendu public.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
        ) : (
          <>
            {/* Mon suivi */}
            {demande && (
              <div className="card-royal" style={{ borderColor: 'rgba(212,175,55,0.25)' }}>
                <h2 className="font-cinzel text-sm font-bold text-pearl mb-2 flex items-center gap-2"><Compass className="w-4 h-4 text-gold" /> Mon accompagnement</h2>
                <p className="font-inter text-sm text-pearl/60">
                  Statut : <span className="text-gold font-semibold">{STATUT_LABEL[demande.statut] || demande.statut}</span>
                  {demande.parcours_recommande ? <> · {demande.parcours_recommande}</> : null}
                </p>
              </div>
            )}

            {/* Diagnostic spirituel */}
            <div className="card-royal">
              <h2 className="font-cinzel text-base font-bold text-pearl mb-1 flex items-center gap-2"><Sparkles className="w-4 h-4 text-gold" /> Diagnostic spirituel</h2>
              <p className="font-inter text-xs text-pearl/45 mb-5">Répondez avec sincérité — il n&apos;y a pas de mauvaise réponse. Le résultat oriente votre parcours.</p>
              <div className="space-y-4">
                {QUESTIONS.map((q, i) => (
                  <div key={i}>
                    <p className="font-inter text-sm text-pearl/75 mb-2">{i + 1}. {q}</p>
                    <div className="flex flex-wrap gap-2">
                      {ECHELLE.map((e) => (
                        <button key={e.v} onClick={() => setAnswers((a) => a.map((x, idx) => idx === i ? e.v : x))}
                          className={`text-xs font-inter px-3 py-1.5 rounded-full border transition-all ${
                            answers[i] === e.v ? 'bg-gold text-black border-transparent' : 'bg-white/5 text-pearl/55 border-white/10 hover:text-pearl'
                          }`}>
                          {e.l}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={submitDiagnostic} disabled={!allAnswered}
                className="btn-gold text-sm px-5 py-2.5 mt-5 inline-flex items-center gap-2 disabled:opacity-50">
                <Compass className="w-4 h-4" /> Obtenir mon parcours recommandé
              </button>

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}>
                  <p className="font-cinzel text-sm font-bold text-gold mb-1">{result.parcours}</p>
                  <p className="font-inter text-sm text-pearl/60">{result.texte}</p>
                </motion.div>
              )}
            </div>

            {/* Prières guidées */}
            {prieres.length > 0 && (
              <div className="card-royal">
                <h2 className="font-cinzel text-base font-bold text-pearl mb-4 flex items-center gap-2"><HeartHandshake className="w-4 h-4 text-gold" /> Prières guidées & auto-délivrance</h2>
                <div className="space-y-2">
                  {prieres.map((r) => (
                    <div key={r.id} className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden">
                      <button onClick={() => setOpenRes(openRes === r.id ? null : r.id)} className="w-full flex items-center justify-between gap-3 p-3.5 text-left">
                        <span className="font-inter text-sm text-pearl/80">{r.titre}</span>
                        <ChevronDown className={`w-4 h-4 text-pearl/40 transition-transform ${openRes === r.id ? 'rotate-180' : ''}`} />
                      </button>
                      {openRes === r.id && r.contenu && (
                        <div className="px-3.5 pb-4 font-inter text-sm text-pearl/60 leading-relaxed whitespace-pre-line border-t border-white/5 pt-3">{r.contenu}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enseignements vidéo / audio */}
            {medias.length > 0 && (
              <div className="card-royal">
                <h2 className="font-cinzel text-base font-bold text-pearl mb-4 flex items-center gap-2"><Play className="w-4 h-4 text-gold" /> Enseignements</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {medias.map((r) => (
                    <a key={r.id} href={r.url || '#'} target="_blank" rel="noreferrer" className="rounded-xl bg-white/[0.02] border border-white/5 p-4 hover:border-gold/20 transition-all">
                      <div className="flex items-center gap-2 mb-1">
                        {r.type === 'video' ? <Play className="w-4 h-4 text-gold" /> : <BookOpen className="w-4 h-4 text-gold" />}
                        <span className="font-cinzel text-sm font-bold text-pearl">{r.titre}</span>
                      </div>
                      {r.description && <p className="font-inter text-xs text-pearl/45">{r.description}</p>}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Ressources PDF */}
            {pdfs.length > 0 && (
              <div className="card-royal">
                <h2 className="font-cinzel text-base font-bold text-pearl mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-gold" /> Ressources à télécharger</h2>
                <div className="space-y-2">
                  {pdfs.map((r) => (
                    <a key={r.id} href={r.url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-gold/20 transition-all">
                      <FileText className="w-4 h-4 text-gold" />
                      <span className="font-inter text-sm text-pearl/75">{r.titre}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Demander un accompagnement */}
            <div className="card-royal" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
              <h2 className="font-cinzel text-base font-bold text-pearl mb-1 flex items-center gap-2"><Lock className="w-4 h-4 text-gold" /> Demander un accompagnement pastoral</h2>
              <p className="font-inter text-xs text-pearl/45 mb-4">Confidentiel. Un membre de l&apos;équipe pastorale prendra soin de vous recontacter.</p>
              {sent ? (
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle className="w-6 h-6" />
                  <p className="font-inter text-sm">Votre demande a été transmise en toute confidentialité. Vous n&apos;êtes pas seul(e). 🙏</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={sujet} onChange={(e) => setSujet(e.target.value)} placeholder="Sujet (facultatif)" className="input-royal w-full text-sm" />
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Décrivez en quelques mots votre besoin…" className="input-royal w-full text-sm resize-none" />
                  <button onClick={submitAccompagnement} disabled={sending} className="btn-gold text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Envoyer ma demande
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

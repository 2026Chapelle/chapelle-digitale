'use client'
/**
 * Admin — Intelligence Pastorale (V2.5-A) — LECTURE SEULE.
 *
 * Synthèses + priorités + recommandations DÉTERMINISTES sur les demandes réelles
 * « Nouveau Venu » (lues via /api/admin/newcomer-intakes). Aucune écriture, aucune
 * modification de statut, aucun envoi, aucune IA externe. Moteur : newcomer-intelligence.
 */
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/ui/PageHeader'
import { Loader2, Users, Clock, UserCheck, HeartHandshake, StickyNote, AlertTriangle, Lightbulb, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react'
import { computeNewcomerIntelligence, type IntakeLite } from '@/lib/pastoral/newcomer-intelligence'

const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: '#0EA5E9' },
  to_review: { label: 'À revoir', color: '#EAB308' },
  contacted: { label: 'Contacté', color: '#8B5CF6' },
  converted: { label: 'Intégré', color: '#22C55E' },
  duplicate: { label: 'Doublon', color: '#6B7280' },
  archived: { label: 'Archivé', color: '#6B7280' },
}
const SEV: Record<string, { label: string; color: string }> = {
  haute: { label: 'À prioriser', color: '#EF4444' },
  moyenne: { label: 'À suivre', color: '#EAB308' },
  douce: { label: 'Attention douce', color: '#6B7280' },
}

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card-royal py-5 px-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div className="font-cinzel text-2xl font-black text-pearl">{value}</div>
      <div className="text-xs text-pearl/40 font-inter mt-0.5">{label}</div>
    </div>
  )
}

/** Signal enrichi (V2.5-B.2-A) — variante compacte acceptant une valeur numérique ou textuelle (ex. « — », « 7 j »). */
function Signal({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div>
      <div>
        <div className="font-cinzel text-lg font-black text-pearl leading-none">{value}</div>
        <div className="text-[11px] text-pearl/45 font-inter mt-1">{label}</div>
      </div>
    </div>
  )
}

export default function IntelligencePastoralePage() {
  const [intakes, setIntakes] = useState<IntakeLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openQ, setOpenQ] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/admin/newcomer-intakes', { credentials: 'same-origin' })
        const j = await r.json().catch(() => ({}))
        if (cancelled) return
        if (!r.ok || j?.ok !== true) { setError('Impossible de charger les données. Réessayez.'); setIntakes([]) }
        else setIntakes(j.data?.intakes || [])
      } catch { if (!cancelled) setError('Impossible de charger les données. Réessayez.') }
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const intel = useMemo(() => computeNewcomerIntelligence(intakes, Date.now()), [intakes])

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container-royal">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <PageHeader eyebrow="Assistant pastoral · lecture seule"
            title={<>Intelligence <span className="text-cinematic-gold">Pastorale</span></>}
            description="Synthèses et recommandations sur l'accueil des nouveaux venus, à partir des données réelles." />
          <Link href="/admin/nouveaux-venus" className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 mt-2">Voir les demandes <ArrowRight className="w-4 h-4" /></Link>
        </div>

        {/* Bandeau lecture seule */}
        <div className="card-royal p-3 mb-6 flex items-center gap-2" style={{ borderColor: 'rgba(34,197,94,0.25)' }}>
          <ShieldCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#22C55E' }} />
          <p className="font-inter text-xs" style={{ color: '#86EFAC' }}>Assistant en <strong>lecture seule</strong> : aucune écriture, aucun changement de statut, aucun envoi. Les recommandations sont dérivées des données disponibles.</p>
        </div>

        {error && <div className="card-royal p-3 mb-4 text-sm text-danger font-inter">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-12"><Loader2 className="w-4 h-4 animate-spin" /> Analyse…</div>
        ) : (
          <>
            {/* Cartes de synthèse */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Kpi icon={Users} label="Nouveaux venus (total)" value={intel.summary.total} color="#D4AF37" />
              <Kpi icon={Clock} label="À contacter" value={intel.summary.aContacter} color="#F59E0B" />
              <Kpi icon={UserCheck} label="Contactés" value={intel.summary.contactes} color="#8B5CF6" />
              <Kpi icon={HeartHandshake} label="Intégrés / en suivi" value={intel.summary.integresOuSuivi} color="#22C55E" />
              <Kpi icon={StickyNote} label="Avec note pastorale" value={intel.summary.avecNote} color="#0EA5E9" />
            </div>

            {/* Signaux enrichis (V2.5-B.2-A) — assignation & conversion, colonnes existantes uniquement */}
            <div className="card-royal p-5 mb-8">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-4"><UserCheck className="w-4 h-4 text-gold" /> Assignation &amp; conversion</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Signal icon={UserCheck} label="Demandes assignées" value={intel.summary.assignes} color="#22C55E" />
                <Signal icon={Users} label="Actives sans responsable" value={intel.summary.nonAssignes} color="#F59E0B" />
                <Signal icon={AlertTriangle} label="Conversions à vérifier" value={intel.summary.conversionsAVerifier} color="#EF4444" />
                <Signal icon={Clock} label="Délai moyen 1ᵉʳ contact" value={intel.summary.delaiContactMoyenJours === null ? '—' : `${intel.summary.delaiContactMoyenJours} j`} color="#8B5CF6" />
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Priorités pastorales */}
              <div className="card-royal p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-gold" /> Priorités pastorales</h2>
                {intel.priorities.length === 0 ? (
                  <p className="text-sm text-pearl/40 font-inter">Aucune demande ne nécessite d'attention particulière pour le moment.</p>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {intel.priorities.map((p) => {
                      const st = STATUS[p.status] || { label: p.status, color: '#6B7280' }
                      const sev = SEV[p.severity]
                      return (
                        <Link key={p.id} href={`/admin/nouveaux-venus/${p.id}`} className="block rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] p-3 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-inter text-sm text-pearl/85">{p.name}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter" style={{ background: `${sev.color}22`, color: sev.color }}>{sev.label}</span>
                          </div>
                          <p className="font-inter text-xs text-pearl/55">{p.reason}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter mt-1.5" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recommandations */}
              <div className="card-royal p-5">
                <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-gold" /> Recommandations</h2>
                {intel.recommendations.length === 0 ? (
                  <p className="text-sm text-pearl/40 font-inter">Rien de particulier à recommander : le suivi semble à jour.</p>
                ) : (
                  <div className="space-y-3">
                    {intel.recommendations.map((rec) => (
                      <div key={rec.id} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>{rec.count}</span>
                        <div>
                          <p className="font-inter text-sm text-pearl/85">{rec.title}</p>
                          <p className="font-inter text-xs text-pearl/45 mt-0.5">{rec.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Questions rapides */}
            <div className="card-royal p-5 mb-6">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-4"><HelpCircle className="w-4 h-4 text-gold" /> Questions rapides</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {intel.quick.map((q) => (
                  <button key={q.id} onClick={() => setOpenQ(openQ === q.id ? null : q.id)}
                    className={`text-xs font-inter px-3 py-1.5 rounded-full border transition-colors ${openQ === q.id ? 'text-gold bg-gold/10 border-gold/30' : 'text-pearl/60 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-gold'}`}>{q.question}</button>
                ))}
              </div>
              {openQ && (() => {
                const q = intel.quick.find((x) => x.id === openQ)
                if (!q) return null
                const LIMIT = 5
                const shown = q.items.slice(0, LIMIT)
                const extra = q.items.length - shown.length
                return (
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                    <p className="font-inter text-sm text-pearl/80">{q.answer}</p>
                    {q.items.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {shown.map((it) => {
                          const st = STATUS[it.status] || { label: it.status, color: '#6B7280' }
                          const sev = SEV[it.severity] || { label: it.severity, color: '#6B7280' }
                          return (
                            <Link key={it.id} href={`/admin/nouveaux-venus/${it.id}`} className="block rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] p-2.5 transition-colors">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-inter text-sm text-pearl/85">{it.name}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter" style={{ background: `${sev.color}22`, color: sev.color }}>{sev.label}</span>
                              </div>
                              <p className="font-inter text-xs text-pearl/55 mt-0.5">{it.reason}</p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter mt-1.5" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                            </Link>
                          )
                        })}
                        {extra > 0 && (
                          <Link href="/admin/nouveaux-venus" className="block text-center text-xs font-inter text-gold/80 hover:text-gold py-1.5">+{extra} autre(s) — voir toutes les demandes</Link>
                        )}
                      </div>
                    ) : (
                      <p className="font-inter text-xs text-pearl/40 mt-2">Aucune demande concernée pour le moment.</p>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Limites & sécurité */}
            <div className="card-royal p-5">
              <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-3"><ShieldCheck className="w-4 h-4 text-gold" /> Limites &amp; sécurité</h2>
              <ul className="space-y-1.5 font-inter text-xs text-pearl/55 list-disc pl-5">
                <li>Assistant strictement en <strong className="text-pearl/75">lecture seule</strong> : il n'écrit rien, ne change aucun statut, n'envoie aucun message.</li>
                <li>Les recommandations sont <strong className="text-pearl/75">déterministes</strong> (règles simples), fondées uniquement sur les données existantes de <code>newcomer_intakes</code>. Pas d'IA externe.</li>
                <li>L'assignation et la conversion utilisent des colonnes <strong className="text-pearl/75">déjà présentes</strong> (<code>assigned_to_profile_id</code>, <code>converted_profile_id</code>) exposées en lecture seule — aucune nouvelle donnée, aucune écriture, aucune migration.</li>
                <li>La donnée <em>zone / territoire / ville / pays</em> <strong className="text-pearl/75">n'existe pas</strong> sur les nouveaux venus : aucune recommandation géographique n'est produite pour eux.</li>
                <li>Le langage employé reste prudent et bienveillant ; ces indications aident au suivi et ne portent aucun jugement sur les personnes.</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'
/**
 * Assistant Pastoral — bloc UI (V2.5-B.2-B-①), intégré dans /admin/intelligence-pastorale.
 * Champ de question CONTRÔLÉ + questions suggérées. La réponse provient UNIQUEMENT de
 * la route serveur /api/admin/pastoral-assistant (déterministe, lecture seule). Aucun
 * texte libre n'est envoyé à une IA ; l'UI n'affiche que ce que le serveur renvoie.
 */
import { useState } from 'react'
import Link from 'next/link'
import { Sparkles, Loader2, ArrowRight, Send, ShieldCheck, Info } from 'lucide-react'
import { SUGGESTED_QUESTIONS } from '@/lib/pastoral/intent-router'
import type { AssistantResponse } from '@/lib/pastoral/assistant-report'

const SEV: Record<string, { label: string; color: string }> = {
  haute: { label: 'À prioriser', color: '#EF4444' },
  moyenne: { label: 'À suivre', color: '#EAB308' },
  douce: { label: 'Attention douce', color: '#6B7280' },
}
const STATUS: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: '#0EA5E9' },
  to_review: { label: 'À revoir', color: '#EAB308' },
  contacted: { label: 'Contacté', color: '#8B5CF6' },
  converted: { label: 'Intégré', color: '#22C55E' },
  duplicate: { label: 'Doublon', color: '#6B7280' },
  archived: { label: 'Archivé', color: '#6B7280' },
}

export function PastoralAssistant() {
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [resp, setResp] = useState<AssistantResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function ask(question: string) {
    const text = (question || '').trim()
    if (!text || loading) return
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/admin/pastoral-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ question: text }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j?.ok !== true) { setErr(j?.message || 'Impossible d’obtenir une réponse. Réessayez.'); setResp(null) }
      else setResp(j.data as AssistantResponse)
    } catch { setErr('Impossible d’obtenir une réponse. Réessayez.'); setResp(null) }
    setLoading(false)
  }

  return (
    <div className="card-royal p-5 mb-6">
      <h2 className="font-cinzel font-bold text-pearl text-sm flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-gold" /> Poser une question pastorale</h2>
      <p className="font-inter text-xs text-pearl/40 mb-4">Assistant déterministe, en lecture seule — il ne modifie rien et n’envoie aucun message.</p>

      <form onSubmit={(e) => { e.preventDefault(); ask(q) }} className="flex items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ex. : Qui dois-je suivre en priorité ?"
          className="input-royal flex-1"
          aria-label="Question pastorale"
        />
        <button type="submit" disabled={loading || !q.trim()} className="btn-gold text-sm px-4 py-2.5 inline-flex items-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Demander
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED_QUESTIONS.map((sq) => (
          <button key={sq} type="button" onClick={() => { setQ(sq); ask(sq) }}
            className="text-xs font-inter px-3 py-1.5 rounded-full border text-pearl/60 border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:text-gold transition-colors">
            {sq}
          </button>
        ))}
      </div>

      {err && <div className="rounded-lg border border-danger/25 bg-danger/5 p-3 text-sm text-danger font-inter">{err}</div>}

      {loading && !resp && (
        <div className="flex items-center gap-2 text-pearl/40 font-inter text-sm py-4"><Loader2 className="w-4 h-4 animate-spin" /> Analyse…</div>
      )}

      {resp && !loading && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
          <div>
            <h3 className="font-cinzel font-bold text-pearl text-sm mb-1">{resp.title}</h3>
            <p className="font-inter text-sm text-pearl/80">{resp.summary}</p>
          </div>

          {resp.findings.length > 0 && (
            <ul className="space-y-1 font-inter text-xs text-pearl/60 list-disc pl-5">
              {resp.findings.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          )}

          {resp.people.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-pearl/35 font-inter">Personnes concernées</div>
              {resp.people.map((p) => {
                const st = STATUS[p.status] || { label: p.status, color: '#6B7280' }
                const sev = p.severity ? SEV[p.severity] : null
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-inter text-sm text-pearl/85">{p.name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter" style={{ background: `${st.color}18`, color: st.color }}>{st.label}</span>
                        {sev && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-inter" style={{ background: `${sev.color}22`, color: sev.color }}>{sev.label}</span>}
                      </div>
                      <p className="font-inter text-xs text-pearl/55 mt-0.5 truncate">{p.reason}</p>
                    </div>
                    <Link href={p.href} className="btn-gold text-xs px-3 py-1.5 inline-flex items-center gap-1 flex-shrink-0">Voir fiche <ArrowRight className="w-3 h-3" /></Link>
                  </div>
                )
              })}
              {resp.peopleTotal > resp.people.length && (
                <Link href="/admin/nouveaux-venus" className="block text-center text-xs font-inter text-gold/80 hover:text-gold py-1.5">
                  +{resp.peopleTotal - resp.people.length} autre(s) — voir toutes les demandes
                </Link>
              )}
            </div>
          )}

          {resp.suggestions.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-pearl/35 font-inter mb-1.5">Suggestions</div>
              <ul className="space-y-1 font-inter text-xs text-pearl/70 list-disc pl-5">
                {resp.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
              </ul>
            </div>
          )}

          {resp.limits.length > 0 && (
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.015] p-3">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-pearl/35 font-inter mb-1.5"><ShieldCheck className="w-3 h-3" /> Limites des données</div>
              <ul className="space-y-1 font-inter text-[11px] text-pearl/45 list-disc pl-5">
                {resp.limits.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </div>
          )}

          <p className="flex items-center gap-1.5 font-inter text-[11px] text-pearl/35"><Info className="w-3 h-3" /> {resp.dataBasis}</p>
        </div>
      )}
    </div>
  )
}

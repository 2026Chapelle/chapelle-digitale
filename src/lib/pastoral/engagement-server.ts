/**
 * ENGAGEMENT — calcul serveur des scores pour PERSISTANCE (Priorité 1).
 *
 * Helper AUTONOME du cron (décision : route /admin/gouvernement laissée intacte).
 * Réutilise la FORMULE PURE `engagementScore` (jamais dupliquée) + la RPC existante
 * `pastoral_member_signals` (avec repli JS strict). Aucune nouvelle colonne, aucune
 * nouvelle RPC, aucune modification des bandes (Option A).
 *
 * Les parties PURES (dayKey, activeDaysFromSessions, scoreFromSignals) sont testées.
 */
import { supabaseAdmin } from '@/lib/supabase'
import { engagementScore, type MemberIntel } from '@/lib/pastoral-intelligence'

const DAY = 86_400_000

export interface EngagementSignals {
  lives: number; downloads: number; prieres: number; prieres_sans_suivi: number
  formations: number; formations_abandonnees: number; events: number; dons: number
}

const ZERO: EngagementSignals = { lives: 0, downloads: 0, prieres: 0, prieres_sans_suivi: 0, formations: 0, formations_abandonnees: 0, events: 0, dons: 0 }

// ── PUR (testable) ────────────────────────────────────────────────────────────

/** Jour calendaire (UTC, YYYY-MM-DD) d'un timestamp ISO. */
export function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

/** Jours distincts actifs sur 30 j, par membre, à partir des sessions analytics. */
export function activeDaysFromSessions(
  sessions: { user_id: string | null; last_seen: string | null }[],
  nowMs: number,
): Map<string, number> {
  const cutoff = nowMs - 30 * DAY
  const sets = new Map<string, Set<string>>()
  for (const s of sessions) {
    if (!s.user_id || !s.last_seen) continue
    const t = Date.parse(s.last_seen)
    if (Number.isNaN(t) || t < cutoff) continue
    const set = sets.get(s.user_id) || new Set<string>()
    set.add(dayKey(s.last_seen))
    sets.set(s.user_id, set)
  }
  const out = new Map<string, number>()
  for (const [uid, set] of Array.from(sets)) out.set(uid, set.size)
  return out
}

/** Score 0-100 via la formule pure existante (champs non utilisés = neutres). */
export function scoreFromSignals(signals: EngagementSignals, activeDays30: number): number {
  const m: MemberIntel = {
    userId: '', nom: '', pays: null, role: null, membre_statut: null, parcours_etape: 0,
    derniere_connexion: null, created_at: null, last_seen: null,
    connexions: 0, total_duration: 0, active_days_30: activeDays30,
    prieres: signals.prieres, prieres_sans_suivi: signals.prieres_sans_suivi,
    formations: signals.formations, formations_abandonnees: signals.formations_abandonnees,
    lives: signals.lives, downloads: signals.downloads, events: signals.events, dons: signals.dons,
  }
  return engagementScore(m)
}

// ── I/O (service role) ─────────────────────────────────────────────────────────

async function loadSignals(pays?: string | null): Promise<Map<string, EngagementSignals>> {
  const byUser = new Map<string, EngagementSignals>()
  // Chemin nominal : RPC SET-based (1 ligne / membre, tous les profils).
  try {
    const { data, error } = await supabaseAdmin.rpc('pastoral_member_signals', { p_pays: pays ?? null })
    if (!error && Array.isArray(data)) {
      for (const r of data as any[]) {
        byUser.set(r.user_id, {
          lives: Number(r.lives) || 0, downloads: Number(r.downloads) || 0,
          prieres: Number(r.prieres) || 0, prieres_sans_suivi: Number(r.prieres_sans_suivi) || 0,
          formations: Number(r.formations) || 0, formations_abandonnees: Number(r.formations_abandonnees) || 0,
          events: Number(r.events) || 0, dons: Number(r.dons) || 0,
        })
      }
      return byUser
    }
  } catch { /* repli ci-dessous */ }

  // Repli JS strict (mêmes définitions que la RPC) si elle est absente/échoue.
  const ensure = (uid: string | null): EngagementSignals | null => {
    if (!uid) return null
    let s = byUser.get(uid)
    if (!s) { s = { ...ZERO }; byUser.set(uid, s) }
    return s
  }
  const since30 = new Date(Date.now() - 30 * DAY).toISOString()
  const { data: profs } = await supabaseAdmin.from('profiles').select('id')
  for (const p of profs || []) ensure(p.id)
  const { data: evts } = await supabaseAdmin.from('analytics_events').select('user_id, type, category').gte('created_at', since30).limit(100000)
  for (const e of (evts || []) as any[]) { const s = ensure(e.user_id); if (!s) continue; if (e.category === 'live') s.lives++; if (e.type === 'download' || e.category === 'pdf') s.downloads++ }
  try { const { data } = await supabaseAdmin.from('priere_demandes').select('user_id, assigned_to, statut'); for (const r of (data || []) as any[]) { const s = ensure(r.user_id); if (!s) continue; s.prieres++; if (!r.assigned_to && ['nouvelle', 'recue', 'en_cours', 'en_attente'].includes(String(r.statut || '').toLowerCase())) s.prieres_sans_suivi++ } } catch { /* */ }
  try { const { data } = await supabaseAdmin.from('inscriptions_formation').select('user_id, statut'); for (const r of (data || []) as any[]) { const s = ensure(r.user_id); if (!s) continue; s.formations++; if (String(r.statut || '').toLowerCase() === 'abandonne') s.formations_abandonnees++ } } catch { /* */ }
  try { const { data } = await supabaseAdmin.from('event_registrations').select('user_id'); for (const r of (data || []) as any[]) { const s = ensure(r.user_id); if (s) s.events++ } } catch { /* */ }
  try { const { data } = await supabaseAdmin.from('dons').select('user_id, statut'); for (const r of (data || []) as any[]) { if (String(r.statut).toLowerCase() === 'complete') { const s = ensure(r.user_id); if (s) s.dons++ } } } catch { /* */ }
  return byUser
}

/**
 * Calcule le score d'engagement (0-100) de chaque membre.
 * @returns Map<user_id, score>. Best-effort : ne lève pas (renvoie une map vide si tout échoue).
 */
export async function computeEngagementScores(opts: { pays?: string | null; nowMs?: number } = {}): Promise<Map<string, number>> {
  const nowMs = opts.nowMs ?? Date.now()
  const signals = await loadSignals(opts.pays)

  // Jours actifs (30 j) depuis les sessions analytics.
  const since30 = new Date(nowMs - 30 * DAY).toISOString()
  let sessions: { user_id: string | null; last_seen: string | null }[] = []
  try {
    const { data } = await supabaseAdmin.from('analytics_sessions').select('user_id, last_seen').gte('last_seen', since30).limit(100000)
    sessions = (data || []) as any[]
  } catch { /* pas de sessions → active_days = 0 partout */ }
  const activeDays = activeDaysFromSessions(sessions, nowMs)

  const scores = new Map<string, number>()
  for (const [uid, sig] of Array.from(signals)) scores.set(uid, scoreFromSignals(sig, activeDays.get(uid) || 0))
  return scores
}

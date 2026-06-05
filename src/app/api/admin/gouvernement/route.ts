import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  type MemberIntel, type PastoralAlert,
  ENGAGEMENT_META, STAGE_META, ALERT_META,
  engagementLevel, engagementScore, conversionStage, memberAlerts, lastActivityDays,
} from '@/lib/pastoral-intelligence'
import { churnRisk, needsFollowUp, ACTION_LABEL, RISK_META, type RiskLevel } from '@/lib/pastoral-prediction'
import { cached } from '@/lib/cache'

/**
 * GOUVERNEMENT PASTORAL — cockpit unique de pilotage de l'église mondiale.
 *   GET /api/admin/gouvernement?pays=CD
 *
 * Agrège : présence temps réel, intelligence membre (6 niveaux d'engagement),
 * échelle de conversion (Visiteur→Leader), alertes pastorales automatiques,
 * carte mondiale (membres + visiteurs + croissance), et pilotage dons /
 * formations / événements / prières.
 *
 * Sécurité : garde admin, lecture service role. `pays` restreint la vue
 * (scope nation_pastor). Ne lit jamais le CONTENU des prières/cure d'âme.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ONLINE_SEC = 90
const GOUV_TTL_MS = 20_000 // cache court : cockpit « temps réel » sans repayer l'agrégat
const dayKey = (iso: string) => iso.slice(0, 10)

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const paysFilter = (req.nextUrl.searchParams.get('pays') || '').trim().toUpperCase() || null
  try {
    // Cache court par contexte (pays) : les rafraîchissements rapprochés du
    // cockpit ne repaient pas les ~15 requêtes Supabase + l'agrégat JS.
    const payload = await cached(`gouvernement:${paysFilter || 'all'}`, GOUV_TTL_MS, () => computeGouvernement(paysFilter))
    return NextResponse.json(payload)
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

async function computeGouvernement(paysFilter: string | null) {
  const now = Date.now()
  const since30 = new Date(now - 30 * 86400_000).toISOString()
  const sinceOnline = new Date(now - ONLINE_SEC * 1000).toISOString()
  const sinceToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()

  {
    // ── Profils (base de l'intelligence membre) ──
    let pq = supabaseAdmin.from('profiles')
      .select('id, prenom, nom, pays, ville, role, membre_statut, parcours_disciple_etape, score_engagement, derniere_connexion, created_at, plateforme_principale')
      .limit(5000)
    if (paysFilter) pq = pq.eq('pays', paysFilter)
    const { data: profs } = await pq

    const M = new Map<string, MemberIntel>()
    const activeDays = new Map<string, Set<string>>()
    for (const p of (profs || []) as any[]) {
      M.set(p.id, {
        userId: p.id, nom: [p.prenom, p.nom].filter(Boolean).join(' ').trim() || 'Membre',
        pays: p.pays || null, role: p.role || null, membre_statut: p.membre_statut || null,
        parcours_etape: Number(p.parcours_disciple_etape) || 0,
        derniere_connexion: p.derniere_connexion || null, created_at: p.created_at || null, last_seen: null,
        connexions: 0, total_duration: 0, active_days_30: 0,
        prieres: 0, prieres_sans_suivi: 0, formations: 0, formations_abandonnees: 0,
        lives: 0, downloads: 0, events: 0, dons: 0,
      })
    }
    const touch = (id: string | null): MemberIntel | null => (id && M.has(id) ? M.get(id)! : null)

    // ── Présence / sessions (analytics_sessions) ──
    const { data: sess } = await supabaseAdmin.from('analytics_sessions')
      .select('user_id, last_seen, duration_sec, pays').gte('last_seen', since30).limit(20000)
    for (const s of (sess || []) as any[]) {
      const m = touch(s.user_id); if (!m) continue
      m.connexions++
      m.total_duration += Number(s.duration_sec) || 0
      if (s.last_seen && (!m.last_seen || s.last_seen > m.last_seen)) m.last_seen = s.last_seen
      if (s.last_seen) { const set = activeDays.get(s.user_id) || new Set<string>(); set.add(dayKey(s.last_seen)); activeDays.set(s.user_id, set) }
    }
    M.forEach((m) => { m.active_days_30 = activeDays.get(m.userId)?.size || 0 })

    // ── Signaux d'engagement (lives, downloads, prières, formations, events, dons) ──
    // Agrégation SET-BASED en base (1 aller-retour, 1 ligne/membre) au lieu de
    // CINQ lectures de tables entières ramenées dans Node. Repli JS strict si la
    // RPC est absente (migration pas encore poussée) ou échoue : chiffres identiques.
    let signalsOk = false
    try {
      const { data: sig, error } = await supabaseAdmin.rpc('pastoral_member_signals', { p_pays: paysFilter })
      if (!error && Array.isArray(sig)) {
        for (const r of sig as any[]) {
          const m = touch(r.user_id); if (!m) continue
          m.lives = Number(r.lives) || 0
          m.downloads = Number(r.downloads) || 0
          m.prieres = Number(r.prieres) || 0
          m.prieres_sans_suivi = Number(r.prieres_sans_suivi) || 0
          m.formations = Number(r.formations) || 0
          m.formations_abandonnees = Number(r.formations_abandonnees) || 0
          m.events = Number(r.events) || 0
          m.dons = Number(r.dons) || 0
        }
        signalsOk = true
      }
    } catch { /* repli ci-dessous */ }

    if (!signalsOk) {
    // ── Événements analytics (lives / téléchargements) ──
    const { data: evts } = await supabaseAdmin.from('analytics_events')
      .select('user_id, type, category').gte('created_at', since30).limit(40000)
    for (const e of (evts || []) as any[]) {
      const m = touch(e.user_id); if (!m) continue
      if (e.category === 'live') m.lives++
      if (e.type === 'download' || e.category === 'pdf') m.downloads++
    }

    // ── Prières (+ sans suivi) ──
    try {
      const { data } = await supabaseAdmin.from('priere_demandes').select('user_id, assigned_to, statut').limit(20000)
      for (const r of (data || []) as any[]) {
        const m = touch(r.user_id); if (!m) continue
        m.prieres++
        const open = ['nouvelle', 'recue', 'en_cours', 'en_attente'].includes(String(r.statut || '').toLowerCase())
        if (!r.assigned_to && open) m.prieres_sans_suivi++
      }
    } catch { /* */ }

    // ── Formations (inscrites / abandonnées) ──
    try {
      const { data } = await supabaseAdmin.from('inscriptions_formation').select('user_id, statut').limit(20000)
      for (const r of (data || []) as any[]) {
        const m = touch(r.user_id); if (!m) continue
        m.formations++
        if (String(r.statut || '').toLowerCase() === 'abandonne') m.formations_abandonnees++
      }
    } catch { /* */ }

    // ── Événements (inscriptions) ──
    try {
      const { data } = await supabaseAdmin.from('event_registrations').select('user_id').limit(20000)
      for (const r of (data || []) as any[]) { const m = touch(r.user_id); if (m) m.events++ }
    } catch { /* */ }

    // ── Dons (complétés) ──
    try {
      const { data } = await supabaseAdmin.from('dons').select('user_id, statut').limit(20000)
      for (const r of (data || []) as any[]) { if (String(r.statut).toLowerCase() === 'complete') { const m = touch(r.user_id); if (m) m.dons++ } }
    } catch { /* */ }
    } // fin du repli JS (!signalsOk)

    // ── Calculs dérivés ──
    const members = Array.from(M.values())
    const niveaux = new Map<string, number>()
    const stages = new Map<string, number>()
    const alerts: PastoralAlert[] = []
    for (const m of members) {
      const lvl = engagementLevel(m, now); niveaux.set(lvl, (niveaux.get(lvl) || 0) + 1)
      const st = conversionStage(m); stages.set(st, (stages.get(st) || 0) + 1)
      alerts.push(...memberAlerts(m, now))
    }

    const sante = (Object.keys(ENGAGEMENT_META) as (keyof typeof ENGAGEMENT_META)[])
      .map((lvl) => ({ level: lvl, label: ENGAGEMENT_META[lvl].label, color: ENGAGEMENT_META[lvl].color, n: niveaux.get(lvl) || 0 }))

    // ── Présence temps réel (toutes sessions, hors filtre membre) ──
    let onlineQ = supabaseAdmin.from('analytics_sessions').select('is_auth, pays').gte('last_seen', sinceOnline)
    if (paysFilter) onlineQ = onlineQ.eq('pays', paysFilter)
    const online = (await onlineQ).data || []
    let todayQ = supabaseAdmin.from('analytics_sessions').select('user_id, pays').gte('last_seen', sinceToday)
    if (paysFilter) todayQ = todayQ.eq('pays', paysFilter)
    const today = (await todayQ).data || []
    const visiteursAnonAjd = today.filter((s: any) => !s.user_id).length

    // ── Échelle de conversion (Visiteur ANONYME + 5 étapes membre, mutuellement exclusives) ──
    const conversion = [
      { stage: 'visiteur', label: STAGE_META.visiteur.label, color: STAGE_META.visiteur.color, n: visiteursAnonAjd },
      ...(['inscrit', 'disciple', 'membre', 'serviteur', 'leader'] as const)
        .map((st) => ({ stage: st, label: STAGE_META[st].label, color: STAGE_META[st].color, n: stages.get(st) || 0 })),
    ]

    // ── Carte mondiale (membres + visiteurs + croissance par pays) ──
    const nationMap = new Map<string, { pays: string; membres: number; nouveaux_30j: number; visiteurs: number }>()
    const getNation = (p?: string | null) => {
      const k = (p && String(p).trim()) || 'Non renseigné'
      if (!nationMap.has(k)) nationMap.set(k, { pays: k, membres: 0, nouveaux_30j: 0, visiteurs: 0 })
      return nationMap.get(k)!
    }
    const monthly: Record<string, number> = {}
    for (const m of members) {
      const c = getNation(m.pays); c.membres++
      if (m.created_at && Date.parse(m.created_at) >= now - 30 * 86400_000) c.nouveaux_30j++
      if (m.created_at) { const ym = m.created_at.slice(0, 7); monthly[ym] = (monthly[ym] || 0) + 1 }
    }
    // Visiteurs par pays (sessions analytics 30 j) — respecte le filtre pays.
    for (const s of (sess || []) as any[]) {
      if (paysFilter && String(s.pays || '').toUpperCase() !== paysFilter) continue
      getNation(s.pays).visiteurs++
    }
    const nations = Array.from(nationMap.values())
      .filter((c) => c.pays !== 'Non renseigné' || c.membres > 0)
      .map((c) => {
        const anciens = c.membres - c.nouveaux_30j // jamais de division par zéro (sinon 100% si nouveaux)
        return { ...c, croissance_pct: anciens > 0 ? Math.round((c.nouveaux_30j / anciens) * 100) : (c.nouveaux_30j > 0 ? 100 : 0) }
      })
      .sort((a, b) => b.membres - a.membres || b.visiteurs - a.visiteurs)
    const croissance = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([mois, n]) => ({ mois, n }))

    // ── Pilotage (dons / formations / événements / prières) ──
    // Jamais additionner des devises différentes → un total PAR devise.
    let dons_count = 0, dons_total_fcfa = 0
    const dons_par_devise: Record<string, number> = {}
    try {
      const { data } = await supabaseAdmin.from('dons').select('montant, devise, statut, user_id').eq('statut', 'complete')
      for (const r of (data || []) as any[]) {
        if (paysFilter) { const m = touch(r.user_id); if (!m) continue }
        dons_count++
        const dev = (r.devise || 'FCFA').toUpperCase()
        const montant = Number(r.montant) || 0
        dons_par_devise[dev] = (dons_par_devise[dev] || 0) + montant
        if (dev === 'XOF' || dev === 'FCFA') dons_total_fcfa += montant
      }
    } catch { /* */ }

    const formations_inscrits = members.reduce((a, m) => a + (m.formations > 0 ? 1 : 0), 0)
    const formations_abandons = members.reduce((a, m) => a + m.formations_abandonnees, 0)
    const events_inscriptions = members.reduce((a, m) => a + m.events, 0)
    const prieres_total = members.reduce((a, m) => a + m.prieres, 0)
    const prieres_sans_suivi = members.reduce((a, m) => a + m.prieres_sans_suivi, 0)
    const temps_total = members.reduce((a, m) => a + m.total_duration, 0)

    // ── Top membres (intelligence détaillée, borné) ──
    const membresDetail = members
      .map((m) => ({
        user_id: m.userId, nom: m.nom, pays: m.pays, stage: conversionStage(m), niveau: engagementLevel(m, now),
        score: engagementScore(m), connexions: m.connexions, temps: m.total_duration,
        temps_moyen: m.connexions ? Math.round(m.total_duration / m.connexions) : 0,
        jours_actifs_30: m.active_days_30, derniere_activite_jours: lastActivityDays(m, now),
        prieres: m.prieres, formations: m.formations, dons: m.dons,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 200)

    // ── Agrégat alertes ──
    const alertCounts = (Object.keys(ALERT_META) as (keyof typeof ALERT_META)[])
      .map((t) => ({ type: t, label: ALERT_META[t].label, severite: ALERT_META[t].severite, n: alerts.filter((a) => a.type === t).length }))
      .filter((a) => a.n > 0)
    const sev = (s: string) => (s === 'haute' ? 0 : s === 'moyenne' ? 1 : 2)
    const alertItems = alerts.sort((a, b) => sev(a.severite) - sev(b.severite)).slice(0, 80)

    // ════════════════ V2 — LES 6 MODULES DE GOUVERNEMENT ════════════════
    const since30ms = now - 30 * 86400_000
    const isMemberStage = (s: string) => ['disciple', 'membre', 'serviteur', 'leader'].includes(s)
    const headCount = async (table: string, build?: (q: any) => any): Promise<number> => {
      try { let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true }); if (build) q = build(q); const { count } = await q; return count || 0 } catch { return 0 }
    }

    // 1) CROISSANCE
    let nouveaux_inscrits = 0, nouveaux_membres = 0, membresStageTotal = 0
    for (const m of members) {
      const st = conversionStage(m)
      if (isMemberStage(st)) membresStageTotal++
      if (m.created_at && Date.parse(m.created_at) >= since30ms) {
        nouveaux_inscrits++
        if (isMemberStage(st)) nouveaux_membres++
      }
    }
    const nouveaux_visiteurs = (sess || []).filter((s: any) => !s.user_id && (!paysFilter || String(s.pays || '').toUpperCase() === paysFilter)).length
    const taux_conversion = members.length ? Math.round((membresStageTotal / members.length) * 100) : 0
    const pays_en_croissance = nations.filter((n) => n.croissance_pct > 0).sort((a, b) => b.croissance_pct - a.croissance_pct).slice(0, 5)
    let pages_convertissantes: { label: string; count: number }[] = []
    try {
      const mp = new Map<string, number>()
      const { data } = await supabaseAdmin.from('analytics_events').select('path').eq('type', 'conversion').gte('created_at', since30).limit(5000)
      for (const e of (data || []) as any[]) if (e.path) mp.set(e.path, (mp.get(e.path) || 0) + 1)
      if (mp.size === 0) {
        const { data: d2 } = await supabaseAdmin.from('analytics_events').select('path').in('category', ['don', 'inscription', 'formation']).gte('created_at', since30).limit(8000)
        for (const e of (d2 || []) as any[]) if (e.path) mp.set(e.path, (mp.get(e.path) || 0) + 1)
      }
      pages_convertissantes = Array.from(mp.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count]) => ({ label, count }))
    } catch { /* */ }

    // 2) SANTÉ SPIRITUELLE (libellés métier sur les 6 niveaux)
    const get6 = (lvl: string) => niveaux.get(lvl) || 0
    const sante_module = {
      engages: get6('tres_engage') + get6('engage'),
      a_suivre: get6('stable') + get6('a_suivre'),
      absents: get6('en_risque'),
      inactifs: get6('inactif'),
      score_moyen: members.length ? Math.round(members.reduce((a, m) => a + engagementScore(m), 0) / members.length) : 0,
      alertes: alerts.length,
      niveaux: sante,
    }

    // 3) FORMATION
    let cours_commences = 0, cours_termines = 0, cours_abandons = 0
    const formationCount = new Map<string, number>()
    try {
      const { data } = await supabaseAdmin.from('inscriptions_formation').select('formation_id, statut').limit(20000)
      for (const r of (data || []) as any[]) {
        cours_commences++
        const st = String(r.statut || '').toLowerCase()
        if (st === 'termine') cours_termines++
        if (st === 'abandonne') cours_abandons++
        if (r.formation_id) formationCount.set(r.formation_id, (formationCount.get(r.formation_id) || 0) + 1)
      }
    } catch { /* */ }
    const certifications = await headCount('certificats')
    let top_formations: { label: string; count: number }[] = []
    try {
      const topIds = Array.from(formationCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
      if (topIds.length) {
        const { data } = await supabaseAdmin.from('formations').select('id, titre').in('id', topIds.map(([id]) => id))
        const tm = new Map((data || []).map((f: any) => [f.id, f.titre]))
        top_formations = topIds.map(([id, count]) => ({ label: (tm.get(id) as string) || 'Formation', count }))
      }
    } catch { /* */ }

    // 4) PRIÈRE
    let priere_recues = 0, priere_traitees = 0, priere_attente = 0
    try {
      let q = supabaseAdmin.from('priere_demandes').select('statut')
      if (paysFilter) q = q.eq('pays', paysFilter)
      const { data } = await q
      const done = ['traite', 'traitee', 'exaucee', 'reponse_recue', 'repondu', 'cloture', 'cloturee', 'temoignage', 'temoignage_recu', 'temoignage_valide']
      const wait = ['nouvelle', 'recue', 'en_cours', 'en_attente']
      for (const r of (data || []) as any[]) {
        priere_recues++
        const st = String(r.statut || '').toLowerCase()
        if (done.includes(st)) priere_traitees++
        else if (wait.includes(st)) priere_attente++
      }
    } catch { /* */ }
    const temoignages_total = await headCount('temoignages')

    // 5) FINANCE (par source / type — jamais d'addition entre devises)
    const finance_par_source: Record<string, number> = {}
    const finance_par_type: Record<string, number> = {}
    try {
      const { data } = await supabaseAdmin.from('dons').select('source, type, statut, user_id').eq('statut', 'complete')
      for (const r of (data || []) as any[]) {
        if (paysFilter) { const m = touch(r.user_id); if (!m) continue }
        const src = r.source || 'autre'; finance_par_source[src] = (finance_par_source[src] || 0) + 1
        const ty = r.type || 'don'; finance_par_type[ty] = (finance_par_type[ty] || 0) + 1
      }
    } catch { /* */ }
    const achats_marketplace = await headCount('product_purchases', (q) => q.eq('statut', 'complete'))

    // 6) MISSION
    const villesSet = new Set<string>()
    const antennesSet = new Set<string>()
    for (const p of (profs || []) as any[]) {
      if (p.ville && String(p.ville).trim()) villesSet.add(String(p.ville).trim().toLowerCase())
      if (p.plateforme_principale) antennesSet.add(String(p.plateforme_principale))
    }
    const groupes_actifs = (await headCount('groupes')) || (await headCount('groups'))
    const evenements_total = (await headCount('evenements')) || (await headCount('events'))

    // ════════════════ V3 — INTELLIGENCE PRÉDICTIVE ════════════════
    const churnByNiveau: Record<RiskLevel, number> = { critique: 0, eleve: 0, moyen: 0, faible: 0 }
    const churnByPays = new Map<string, { total: number; risque: number }>()
    const followQueue: any[] = []
    for (const m of members) {
      const c = churnRisk(m, now)
      churnByNiveau[c.niveau]++
      const k = m.pays || 'Non renseigné'
      const cp = churnByPays.get(k) || { total: 0, risque: 0 }
      cp.total++; if (c.niveau === 'critique' || c.niveau === 'eleve') cp.risque++
      churnByPays.set(k, cp)
      const fu = needsFollowUp(m, now)
      if (fu) followQueue.push({ user_id: m.userId, nom: m.nom, pays: m.pays, score: fu.score, niveau: fu.niveau, action: fu.action, action_label: ACTION_LABEL[fu.action], facteurs: fu.facteurs, jours: fu.jours_sans_activite })
    }
    followQueue.sort((a, b) => b.score - a.score)
    const churn = (Object.keys(RISK_META) as RiskLevel[]).map((lvl) => ({ niveau: lvl, label: RISK_META[lvl].label, color: RISK_META[lvl].color, n: churnByNiveau[lvl] }))
    // Alerte de mobilisation : pays dont ≥40% des membres sont à risque (min. 5 membres).
    const mobilisation = Array.from(churnByPays.entries())
      .map(([pays, v]) => ({ pays, total: v.total, part_risque: v.total ? Math.round((v.risque / v.total) * 100) : 0 }))
      .filter((x) => x.total >= 5 && x.part_risque >= 40)
      .sort((a, b) => b.part_risque - a.part_risque)
    const intelligence = { churn, suivi: followQueue.slice(0, 60), suivi_total: followQueue.length, mobilisation }

    const modules = {
      croissance: { nouveaux_visiteurs, nouveaux_inscrits, nouveaux_membres, taux_conversion, pays_en_croissance, pages_convertissantes },
      sante: sante_module,
      formation: { cours_commences, cours_termines, cours_abandons, certifications, top_formations },
      priere: { recues: priere_recues, traitees: priere_traitees, en_attente: priere_attente, temoignages: temoignages_total },
      finance: { dons_count, dons_total_fcfa, dons_par_devise, par_source: finance_par_source, par_type: finance_par_type, achats_marketplace },
      mission: { pays_touches: nations.length, villes_touchees: villesSet.size, groupes_actifs, evenements: evenements_total, antennes: antennesSet.size },
    }

    return {
      ok: true, pays: paysFilter,
      modules, intelligence,
      pilotage: {
        membres_total: members.length,
        connectes_now: online.length,
        connectes_membres: online.filter((s: any) => s.is_auth).length,
        visiteurs_aujourdhui: today.length,
        visiteurs_anon_aujourdhui: visiteursAnonAjd,
        dons_count, dons_total_fcfa, dons_par_devise,
        formations_inscrits, formations_abandons,
        events_inscriptions, prieres_total, prieres_sans_suivi,
        temps_total_sec: temps_total,
      },
      sante, conversion,
      alertes: { counts: alertCounts, total: alerts.length, items: alertItems },
      carte: { nations, croissance },
      membres: membresDetail,
    }
  }
}

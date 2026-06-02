/**
 * Couche de requêtes LIVE du back-office — branche les écrans admin sur les
 * vues/tables Supabase du schéma `chapelle` (créées par les migrations v2).
 *
 * Principe : chaque fonction part du SQUELETTE mock existant (mêmes types/forme)
 * puis SURCHARGE les champs avec les valeurs réelles Supabase. Ainsi :
 *   - en mode démo (Supabase non configuré) → renvoie `null` ⇒ l'UI garde son mock,
 *   - en mode réel → renvoie la même forme, valeurs réelles, l'UI ne change pas.
 *
 * SERVER-ONLY : utilise `supabaseAdmin` (service role). À n'appeler que depuis
 * des route handlers / server actions (cf. /api/admin/data/[resource]).
 */
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { emptyDashboardStats, type DashboardStats, type DateRange } from '@/lib/admin-analytics'
import { type FormSubmission, type FormStatus } from '@/lib/admin-data'
import { type MembreMock } from '@/lib/mock/membres'
import { TUNNEL_STAGES } from '@/lib/tunnel'

const db = () => supabaseAdmin.schema('chapelle')

// ---------------------------------------------------------------------------
// Présentation : drapeaux pays + palette des CTA + étapes de progression
// ---------------------------------------------------------------------------
const COUNTRY_FLAGS: Record<string, string> = {
  FR: '🇫🇷', France: '🇫🇷',
  CD: '🇨🇩', 'RD Congo': '🇨🇩',
  CI: '🇨🇮', "Côte d’Ivoire": '🇨🇮',
  CM: '🇨🇲', Cameroun: '🇨🇲',
  CA: '🇨🇦', Canada: '🇨🇦',
  BE: '🇧🇪', Belgique: '🇧🇪',
  US: '🇺🇸', GB: '🇬🇧', SN: '🇸🇳', CH: '🇨🇭', TG: '🇹🇬', BJ: '🇧🇯', GA: '🇬🇦',
}
const flagFor = (pays: string) => COUNTRY_FLAGS[pays] || COUNTRY_FLAGS[pays?.toUpperCase?.()] || '🌍'

const CTA_PALETTE = ['#D4AF37', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9', '#F97316', '#14B8A6']

// tunnel_stage (chapelle) → libellé + couleur pour la carte "Progression des membres"
const PROGRESSION_STAGES: { key: string; etape: string; color: string }[] = [
  { key: 'visiteur', etape: 'Visiteur', color: '#6B7280' },
  { key: 'contact', etape: 'Contact', color: '#818CF8' },
  { key: 'integration', etape: 'Intégration', color: '#0EA5E9' },
  { key: 'disciple', etape: 'Disciple', color: '#D4AF37' },
  { key: 'membre', etape: 'Membre', color: '#22C55E' },
  { key: 'serviteur', etape: 'Serviteur', color: '#F97316' },
  { key: 'leader', etape: 'Leader', color: '#8B5CF6' },
]

// ---------------------------------------------------------------------------
// DASHBOARD — agrégats temps réel via RPC chapelle.admin_dashboard(range)
// On part du mock (mêmes types) puis on SURCHARGE avec les valeurs réelles.
// KPIs : toujours surchargés (0 est une valeur valide). Listes : surchargées
// uniquement si non vides → dégradation gracieuse tant que le trafic est faible.
// ---------------------------------------------------------------------------
export async function liveDashboard(range: DateRange): Promise<DashboardStats | null> {
  if (IS_DEMO_MODE) return null
  // Base à ZÉRO (aucune donnée fictive) ; surchargée par les valeurs réelles du RPC.
  const base = emptyDashboardStats(range)
  const sb = db()

  try {
    const { data: d, error } = await sb.rpc('admin_dashboard', { p_range: range })
    if (error || !d) return base
    const r = d as Record<string, any>
    const num = (v: any) => Number(v ?? 0)

    // ── KPIs ───────────────────────────────────────────────────────────
    base.visiteursAujourdhui = { value: num(r.visiteurs_today), delta: null, unit: 'number' }
    base.visiteursSemaine = { value: num(r.visiteurs_semaine), delta: null, unit: 'number' }
    base.visiteursPeriode = { value: num(r.visiteurs_periode), delta: null, unit: 'number' }
    base.inscriptions = { value: num(r.inscriptions), delta: null, unit: 'number' }
    base.formulairesRecus = { value: num(r.formulaires), delta: null, unit: 'number' }
    base.demandesPriere = { value: num(r.demandes_priere), delta: null, unit: 'number' }
    base.nouveauxMembres = { value: num(r.nouveaux_membres), delta: null, unit: 'number' }
    base.donsRecus = { value: num(r.dons), delta: null, unit: 'currency' }
    base.formationsCommencees = { value: num(r.formations_commencees), delta: null, unit: 'number' }
    const vis = num(r.visiteurs_periode)
    base.tauxConversion = {
      value: vis > 0 ? Math.round((num(r.nouveaux_membres) / vis) * 1000) / 10 : 0,
      delta: null, unit: 'percent',
    }

    // ── Listes (surcharge si non vide) ─────────────────────────────────
    const topPages = (r.top_pages as any[]) ?? []
    if (topPages.length) base.topPages = topPages.map((p) => ({ path: p.path, views: num(p.views) }))

    const pays = (r.pays as any[]) ?? []
    if (pays.length) base.paysVisiteurs = pays.map((p) => ({ pays: p.pays, flag: flagFor(p.pays), visiteurs: num(p.visiteurs) }))

    const clics = (r.clics as any[]) ?? []
    if (clics.length) base.clicsBoutons = clics.map((c, i) => ({ label: c.cta, clicks: num(c.clicks), color: CTA_PALETTE[i % CTA_PALETTE.length] }))

    // ── Tunnel + progression (toujours surchargés, 0 si absent) ────────
    const tunnelBy: Record<string, number> = {}
    for (const t of ((r.tunnel as any[]) ?? [])) tunnelBy[t.stage] = num(t.nb)
    base.tunnelActivite = TUNNEL_STAGES.map((s) => ({ key: s.key, nom: s.nom, count: tunnelBy[s.key] ?? 0, color: s.color }))

    const progBy: Record<string, number> = {}
    for (const p of ((r.progression as any[]) ?? [])) progBy[p.stage] = num(p.nb)
    base.progressionMembres = PROGRESSION_STAGES.map((s) => ({ etape: s.etape, membres: progBy[s.key] ?? 0, color: s.color }))

    // ── Tendance (surcharge si non vide) ───────────────────────────────
    const tendance = (r.tendance as any[]) ?? []
    if (tendance.length) base.tendance = tendance.map((p) => ({ label: p.label, visiteurs: num(p.visiteurs), inscriptions: num(p.inscriptions) }))
  } catch { /* garde le mock en cas d'erreur réseau/SQL */ }

  // Messages récents : dernières soumissions de formulaire (table dédiée)
  try {
    const { data: recents } = await sb
      .from('form_submissions')
      .select('form_slug, payload, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    if (recents?.length) {
      base.messagesRecents = (recents as any[]).map((r) => ({
        nom: r.payload?.prenom || r.email || 'Visiteur',
        type: r.form_slug || 'Contact',
        extrait: r.payload?.message || '—',
        temps: new Date(r.created_at).toLocaleDateString('fr-FR'),
        color: '#0EA5E9',
      }))
    }
  } catch { /* garde le mock */ }

  return base
}

// ---------------------------------------------------------------------------
// FORMULAIRES — table form_submissions
// ---------------------------------------------------------------------------
export async function liveForms(): Promise<FormSubmission[] | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data } = await db()
      .from('form_submissions')
      .select('id, form_slug, payload, email, telephone, source, traite, created_at')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!data) return []
    return (data as any[]).map((r) => ({
      id: r.id,
      source: r.source || r.form_slug || 'web',
      stage: r.payload?.stage || 'contact',
      prenom: r.payload?.prenom || '—',
      email: r.email || r.payload?.email || '',
      telephone: r.telephone || r.payload?.telephone || undefined,
      message: r.payload?.message || undefined,
      status: (r.traite ? 'traite' : 'nouveau') as FormStatus,
      date: new Date(r.created_at).toLocaleString('fr-FR'),
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// MEMBRES — table members (+ première plateforme via memberships)
// ---------------------------------------------------------------------------
const ROLE_MAP: Record<string, MembreMock['role']> = {
  visiteur: 'visiteur', membre: 'membre', serviteur: 'serviteur',
  leader_cellule: 'leader', responsable_plateforme: 'leader', pasteur: 'pasteur', admin: 'admin',
}
const STAGE_INDEX: Record<string, number> = {
  visiteur: 0, contact: 1, integration: 2, disciple: 3, membre: 4, serviteur: 5, leader: 6,
}

export async function liveMembers(): Promise<MembreMock[] | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data } = await db()
      .from('members')
      .select('id, prenom, nom, email, pays, statut, tunnel_stage, role_global, score_engagement, created_at, memberships(platforms(nom))')
      .order('score_engagement', { ascending: false })
      .limit(500)
    if (!data) return []
    return (data as any[]).map((m) => ({
      id: m.id,
      prenom: m.prenom || '',
      nom: m.nom || '',
      email: m.email || '',
      pays: m.pays || '',
      plateforme: m.memberships?.[0]?.platforms?.nom || 'CIER',
      role: ROLE_MAP[m.role_global] || 'membre',
      statut: (m.statut === 'archive' ? 'inactif' : m.statut) as MembreMock['statut'],
      score_engagement: m.score_engagement ?? 0,
      etape_parcours: STAGE_INDEX[m.tunnel_stage] ?? 0,
      date_inscription: (m.created_at || '').slice(0, 10),
      formations_suivies: 0,
      prieres_soumises: 0,
    }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// PLATEFORMES — vue v_platform_overview
// ---------------------------------------------------------------------------
export async function livePlatforms(): Promise<any[] | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data } = await db().from('v_platform_overview').select('*')
    return data ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// PARCOURS / TUNNEL — vues v_tunnel_funnel + v_tunnel_par_stage
// ---------------------------------------------------------------------------
export async function liveTunnel(): Promise<any | null> {
  if (IS_DEMO_MODE) return null
  try {
    const sb = db()
    const [{ data: funnel }, { data: parStage }] = await Promise.all([
      sb.from('v_tunnel_funnel').select('*').single(),
      sb.from('v_tunnel_par_stage').select('*'),
    ])
    return { funnel: funnel ?? null, parStage: parStage ?? [] }
  } catch {
    return null
  }
}

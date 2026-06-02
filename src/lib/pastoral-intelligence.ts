/**
 * Intelligence pastorale — logique PURE (sans I/O), testable & réutilisable.
 *
 * Transforme des signaux réels par membre (connexions, formations, lives,
 * téléchargements, prières, événements, dons, récence) en :
 *   - un niveau d'engagement sur 6 paliers (santé spirituelle),
 *   - une étape dans l'échelle de conversion (Visiteur → Leader),
 *   - des alertes pastorales automatiques.
 *
 * Aucune donnée inventée : un membre sans signal réel reste « inactif / à suivre ».
 */

export interface MemberIntel {
  userId: string
  nom: string
  pays: string | null
  role: string | null
  membre_statut: string | null
  parcours_etape: number
  derniere_connexion: string | null
  created_at: string | null
  last_seen: string | null            // dernière session analytics
  // Présence (analytics_sessions)
  connexions: number                  // nb de sessions = visites
  total_duration: number              // secondes cumulées
  active_days_30: number              // jours distincts actifs sur 30 j
  // Signaux d'engagement
  prieres: number
  prieres_sans_suivi: number
  formations: number
  formations_abandonnees: number
  lives: number
  downloads: number
  events: number
  dons: number
}

const DAY = 86_400_000

/** Jours depuis la dernière activité connue (connexion profil OU session analytics). */
export function lastActivityDays(m: MemberIntel, now: number): number | null {
  const ts: number[] = []
  if (m.derniere_connexion) { const t = Date.parse(m.derniere_connexion); if (!isNaN(t)) ts.push(t) }
  if (m.last_seen) { const t = Date.parse(m.last_seen); if (!isNaN(t)) ts.push(t) }
  if (!ts.length) return null
  return Math.floor((now - Math.max(...ts)) / DAY)
}

export function accountAgeDays(m: MemberIntel, now: number): number {
  const t = m.created_at ? Date.parse(m.created_at) : NaN
  return isNaN(t) ? 0 : Math.floor((now - t) / DAY)
}

// ── Niveau d'engagement (6 paliers) ──
export type EngagementLevel = 'tres_engage' | 'engage' | 'stable' | 'a_suivre' | 'en_risque' | 'inactif'

export const ENGAGEMENT_META: Record<EngagementLevel, { label: string; color: string; order: number }> = {
  tres_engage: { label: 'Très engagé', color: '#22C55E', order: 0 },
  engage:      { label: 'Engagé',      color: '#84CC16', order: 1 },
  stable:      { label: 'Stable',      color: '#EAB308', order: 2 },
  a_suivre:    { label: 'À suivre',    color: '#F59E0B', order: 3 },
  en_risque:   { label: 'En risque',   color: '#EF4444', order: 4 },
  inactif:     { label: 'Inactif',     color: '#6B7280', order: 5 },
}

/** Score d'engagement brut (0-100+) à partir des signaux récents. */
export function engagementScore(m: MemberIntel): number {
  const breadth = [m.prieres, m.formations, m.lives, m.downloads, m.events, m.dons].filter((x) => x > 0).length
  const raw =
    Math.min(m.active_days_30, 20) * 3 +
    breadth * 8 +
    Math.min(m.formations, 5) * 5 +
    Math.min(m.dons, 5) * 6 +
    Math.min(m.prieres, 10) * 2 +
    Math.min(m.lives, 10) * 2 +
    Math.min(m.events, 10) * 3 +
    Math.min(m.downloads, 10) * 1
  return Math.min(raw, 100) // échelle normalisée 0-100 (cohérente avec les seuils)
}

export function engagementLevel(m: MemberIntel, now: number): EngagementLevel {
  const d = lastActivityDays(m, now)
  // Récence = priorité pastorale absolue.
  if (d === null) return accountAgeDays(m, now) > 14 ? 'inactif' : 'a_suivre'
  if (d > 60) return 'inactif'
  if (d > 30) return 'en_risque'
  const score = engagementScore(m)
  if (score >= 60) return 'tres_engage'
  if (score >= 35) return 'engage'
  if (score >= 15) return 'stable'
  return 'a_suivre'
}

// ── Échelle de conversion (Visiteur → Leader) ──
export type ConversionStage = 'visiteur' | 'inscrit' | 'disciple' | 'membre' | 'serviteur' | 'leader'

export const STAGE_META: Record<ConversionStage, { label: string; color: string; order: number }> = {
  visiteur:  { label: 'Visiteur',  color: '#6B7280', order: 0 },
  inscrit:   { label: 'Inscrit',   color: '#0EA5E9', order: 1 },
  disciple:  { label: 'Disciple',  color: '#8B5CF6', order: 2 },
  membre:    { label: 'Membre',    color: '#22C55E', order: 3 },
  serviteur: { label: 'Serviteur', color: '#D4AF37', order: 4 },
  leader:    { label: 'Leader',    color: '#F5E6A7', order: 5 },
}

const LEADER_ROLES = new Set(['super_admin', 'admin', 'pasteur', 'berger', 'coordinateur', 'leader'])
const SERVITEUR_ROLES = new Set(['formateur', 'responsable', 'responsable_integration', 'responsable_mahanaim'])
const MEMBRE_STATUTS = new Set(['membre', 'membre_actif', 'fidele', 'actif', 'nouveau_membre'])

/** Étape de conversion d'un profil (les visiteurs anonymes sont comptés à part). */
export function conversionStage(m: { role: string | null; membre_statut: string | null; parcours_etape: number }): ConversionStage {
  const r = (m.role || '').toLowerCase()
  const s = (m.membre_statut || '').toLowerCase()
  if (LEADER_ROLES.has(r) || s === 'leader_cellule' || s === 'berger' || s === 'pasteur') return 'leader'
  if (SERVITEUR_ROLES.has(r)) return 'serviteur'
  if (s === 'disciple' || r === 'disciple' || m.parcours_etape >= 5) return 'disciple'
  if (MEMBRE_STATUTS.has(s) || r === 'membre') return 'membre'
  return 'inscrit' // possède un compte → au minimum « inscrit »
}

// ── Alertes pastorales ──
export type AlertType =
  | 'absent_7j' | 'absent_30j' | 'formation_abandonnee'
  | 'baisse_activite' | 'nouveau_sans_integration' | 'priere_sans_suivi'

export const ALERT_META: Record<AlertType, { label: string; severite: 'haute' | 'moyenne' | 'info' }> = {
  absent_30j: { label: 'Absent depuis 30 jours', severite: 'haute' },
  absent_7j: { label: 'Absent depuis 7 jours', severite: 'moyenne' },
  formation_abandonnee: { label: 'Formation abandonnée', severite: 'moyenne' },
  baisse_activite: { label: "Baisse brutale d'activité", severite: 'moyenne' },
  nouveau_sans_integration: { label: 'Nouveau membre sans intégration', severite: 'haute' },
  priere_sans_suivi: { label: 'Demande de prière sans suivi', severite: 'haute' },
}

export interface PastoralAlert {
  type: AlertType
  severite: 'haute' | 'moyenne' | 'info'
  user_id: string
  nom: string
  pays: string | null
  detail: string
}

/** Construit la liste des alertes pour un membre (peut en générer plusieurs). */
export function memberAlerts(m: MemberIntel, now: number): PastoralAlert[] {
  const out: PastoralAlert[] = []
  const base = { user_id: m.userId, nom: m.nom, pays: m.pays }
  const stage = conversionStage(m)
  const isMember = stage !== 'inscrit' && stage !== 'visiteur'
  const d = lastActivityDays(m, now)
  const age = accountAgeDays(m, now)

  // Prière sans suivi (tous publics).
  if (m.prieres_sans_suivi > 0) {
    out.push({ ...base, type: 'priere_sans_suivi', severite: ALERT_META.priere_sans_suivi.severite, detail: `${m.prieres_sans_suivi} demande(s) non assignée(s)` })
  }
  // Formation abandonnée.
  if (m.formations_abandonnees > 0) {
    out.push({ ...base, type: 'formation_abandonnee', severite: ALERT_META.formation_abandonnee.severite, detail: `${m.formations_abandonnees} formation(s) abandonnée(s)` })
  }
  // Nouveau membre sans intégration (compte récent, aucun signal d'intégration).
  if (age <= 14 && m.parcours_etape === 0 && m.formations === 0 && m.prieres === 0 && m.events === 0) {
    out.push({ ...base, type: 'nouveau_sans_integration', severite: ALERT_META.nouveau_sans_integration.severite, detail: `Inscrit il y a ${age} j, aucun parcours entamé` })
  }
  // Absences (membres réels uniquement, pour éviter le bruit).
  if (isMember && d !== null) {
    if (d >= 30) out.push({ ...base, type: 'absent_30j', severite: ALERT_META.absent_30j.severite, detail: `Dernière activité il y a ${d} j` })
    else if (d >= 7) out.push({ ...base, type: 'absent_7j', severite: ALERT_META.absent_7j.severite, detail: `Dernière activité il y a ${d} j` })
  }
  // Membre sans AUCUNE activité enregistrée mais compte ancien → à réengager.
  if (isMember && d === null && age >= 7) {
    out.push({ ...base, type: 'absent_30j', severite: ALERT_META.absent_30j.severite, detail: `Aucune activité depuis l'inscription (il y a ${age} j)` })
  }
  // Baisse brutale : engagement passé réel mais retrait récent (7-30 j).
  if (isMember && d !== null && d >= 7 && d < 30 && (m.connexions >= 4 || m.formations >= 1 || m.dons >= 1)) {
    out.push({ ...base, type: 'baisse_activite', severite: ALERT_META.baisse_activite.severite, detail: `Membre actif auparavant, silencieux depuis ${d} j` })
  }
  return out
}

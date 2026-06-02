/**
 * ADMIN ANALYTICS — couche de données du tableau de bord Citadelle.
 *
 * Aujourd'hui : données mock déterministes (aucune dépendance réseau, build OK).
 * Demain : remplacer le corps de `getDashboardStats` par des requêtes Supabase
 * (ex: table `analytics_events`, `members`, `prayer_requests`, `form_submissions`,
 * `donations`). La signature et les types restent identiques → les composants
 * UI ne changent pas.
 *
 * Architecture cible Supabase (vue d'ensemble) :
 *   - `analytics_events(id, type, path, button_id, country, created_at)`  → visiteurs, pages vues, clics
 *   - `members(id, tunnel_stage, status, created_at)`                     → inscriptions, membres, tunnel
 *   - `prayer_requests(id, created_at)`                                   → demandes de prière
 *   - `form_submissions(id, source, created_at)`                         → formulaires reçus
 *   - `donations(id, amount, created_at)`                                → dons reçus
 *   Agréger par `created_at >= now() - range` côté SQL (RPC ou vues matérialisées).
 */
import { TUNNEL_STAGES } from '@/lib/tunnel'

export type DateRange = 'today' | '7d' | '30d'

export const RANGE_LABELS: Record<DateRange, string> = {
  today: "Aujourd'hui",
  '7d': '7 jours',
  '30d': '30 jours',
}

/** Carte de stat : valeur + variation vs période précédente. */
export interface Stat {
  value: number
  /** Variation en % (peut être négative). null = pas de comparaison. */
  delta: number | null
  /** Unité d'affichage : 'number' | 'currency' | 'percent'. */
  unit?: 'number' | 'currency' | 'percent'
}

export interface TopPage { path: string; views: number }
export interface CountryStat { pays: string; flag: string; visiteurs: number }
export interface ButtonClick { label: string; clicks: number; color: string }
export interface TunnelActivity { key: string; nom: string; count: number; color: string }
export interface MemberProgress { etape: string; membres: number; color: string }
export interface RecentMessage { nom: string; type: string; extrait: string; temps: string; color: string }
export interface TechAlert { niveau: 'ok' | 'warn' | 'error'; titre: string; detail: string; temps: string }
export interface TrendPoint { label: string; visiteurs: number; inscriptions: number }

export interface DashboardStats {
  range: DateRange
  // KPI principaux
  visiteursAujourdhui: Stat
  visiteursSemaine: Stat
  visiteursPeriode: Stat
  inscriptions: Stat
  formulairesRecus: Stat
  demandesPriere: Stat
  nouveauxMembres: Stat
  tauxConversion: Stat // visiteur → membre, en %
  formationsCommencees: Stat
  donsRecus: Stat // en euros
  // Listes / graphes
  topPages: TopPage[]
  paysVisiteurs: CountryStat[]
  clicsBoutons: ButtonClick[]
  tunnelActivite: TunnelActivity[]
  progressionMembres: MemberProgress[]
  messagesRecents: RecentMessage[]
  alertesTechniques: TechAlert[]
  tendance: TrendPoint[]
}

// Multiplicateurs par période (pour faire varier les chiffres avec le filtre).
const MULT: Record<DateRange, number> = { today: 1, '7d': 6.4, '30d': 26 }

function scale(base: number, range: DateRange) {
  return Math.round(base * MULT[range])
}

/** Série temporelle mock selon la période. */
function buildTrend(range: DateRange): TrendPoint[] {
  if (range === 'today') {
    const hours = ['00h', '04h', '08h', '12h', '16h', '20h']
    const v = [40, 28, 120, 210, 260, 180]
    const ins = [2, 1, 6, 11, 14, 9]
    return hours.map((label, i) => ({ label, visiteurs: v[i], inscriptions: ins[i] }))
  }
  if (range === '7d') {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
    const v = [820, 910, 870, 1040, 1180, 1460, 1320]
    const ins = [22, 28, 25, 31, 38, 47, 41]
    return days.map((label, i) => ({ label, visiteurs: v[i], inscriptions: ins[i] }))
  }
  const weeks = ['S1', 'S2', 'S3', 'S4']
  const v = [5200, 5800, 6400, 7100]
  const ins = [150, 178, 205, 240]
  return weeks.map((label, i) => ({ label, visiteurs: v[i], inscriptions: ins[i] }))
}

/**
 * Statistiques VIDES (zéro / listes vides) — utilisé comme état initial du
 * dashboard pour ne JAMAIS afficher de chiffre fictif. Les vraies valeurs
 * arrivent ensuite de Supabase (RPC admin_dashboard) ; sinon tout reste à 0.
 */
export function emptyDashboardStats(range: DateRange = '7d'): DashboardStats {
  const z = (unit: Stat['unit'] = 'number'): Stat => ({ value: 0, delta: 0, unit })
  return {
    range,
    visiteursAujourdhui: z(), visiteursSemaine: z(), visiteursPeriode: z(),
    inscriptions: z(), formulairesRecus: z(), demandesPriere: z(),
    nouveauxMembres: z(), tauxConversion: z('percent'),
    formationsCommencees: z(), donsRecus: z('currency'),
    topPages: [], paysVisiteurs: [], clicsBoutons: [],
    tunnelActivite: [], progressionMembres: [],
    messagesRecents: [], alertesTechniques: [], tendance: [],
  }
}

/**
 * Récupère les statistiques du dashboard pour une période.
 * MOCK déterministe — à remplacer par des requêtes Supabase (cf. en-tête).
 */
export function getDashboardStats(range: DateRange = '7d'): DashboardStats {
  const tunnelActivite: TunnelActivity[] = TUNNEL_STAGES.map((s, i) => ({
    key: s.key,
    nom: s.nom,
    count: scale([1240, 420, 280, 190, 320, 140, 38][i] ?? 50, range),
    color: s.color,
  }))

  const progressionMembres: MemberProgress[] = [
    { etape: 'Nouveau', membres: 312, color: '#818CF8' },
    { etape: 'Disciple', membres: 540, color: '#D4AF37' },
    { etape: 'Membre', membres: 1180, color: '#22C55E' },
    { etape: 'Serviteur', membres: 264, color: '#F97316' },
    { etape: 'Leader', membres: 86, color: '#8B5CF6' },
  ]

  return {
    range,
    visiteursAujourdhui: { value: 1342, delta: 12.4, unit: 'number' },
    visiteursSemaine: { value: 8460, delta: 8.1, unit: 'number' },
    visiteursPeriode: { value: scale(1342, range), delta: 9.7, unit: 'number' },
    inscriptions: { value: scale(48, range), delta: 15.2, unit: 'number' },
    formulairesRecus: { value: scale(63, range), delta: 22.0, unit: 'number' },
    demandesPriere: { value: scale(37, range), delta: -4.3, unit: 'number' },
    nouveauxMembres: { value: scale(29, range), delta: 11.0, unit: 'number' },
    tauxConversion: { value: 3.6, delta: 0.4, unit: 'percent' },
    formationsCommencees: { value: scale(54, range), delta: 18.7, unit: 'number' },
    donsRecus: { value: scale(920, range), delta: 6.5, unit: 'currency' },

    topPages: [
      { path: '/', views: scale(540, range) },
      { path: '/live', views: scale(410, range) },
      { path: '/parcours', views: scale(286, range) },
      { path: '/rejoindre', views: scale(254, range) },
      { path: '/formations', views: scale(212, range) },
      { path: '/integration', views: scale(168, range) },
      { path: '/servir', views: scale(132, range) },
    ],

    paysVisiteurs: [
      { pays: 'France', flag: '🇫🇷', visiteurs: scale(420, range) },
      { pays: 'RD Congo', flag: '🇨🇩', visiteurs: scale(310, range) },
      { pays: 'Côte d’Ivoire', flag: '🇨🇮', visiteurs: scale(186, range) },
      { pays: 'Cameroun', flag: '🇨🇲', visiteurs: scale(142, range) },
      { pays: 'Canada', flag: '🇨🇦', visiteurs: scale(98, range) },
      { pays: 'Belgique', flag: '🇧🇪', visiteurs: scale(74, range) },
    ],

    clicsBoutons: [
      { label: 'Rejoindre la Chapelle', clicks: scale(186, range), color: '#D4AF37' },
      { label: 'Faire un don', clicks: scale(94, range), color: '#22C55E' },
      { label: 'Regarder le live', clicks: scale(142, range), color: '#EF4444' },
      { label: 'Commencer une formation', clicks: scale(78, range), color: '#8B5CF6' },
      { label: 'Demander une prière', clicks: scale(63, range), color: '#EC4899' },
    ],

    tunnelActivite,
    progressionMembres,

    messagesRecents: [
      { nom: 'Amandine K.', type: 'Contact', extrait: 'Bonjour, comment rejoindre une cellule à Paris ?', temps: 'Il y a 12 min', color: '#0EA5E9' },
      { nom: 'Jean-Pierre M.', type: 'Prière', extrait: 'Merci de prier pour ma famille…', temps: 'Il y a 38 min', color: '#EC4899' },
      { nom: 'Fatou D.', type: 'Servir', extrait: "Je souhaite rejoindre l'équipe louange.", temps: 'Il y a 1 h', color: '#F97316' },
      { nom: 'Samuel O.', type: 'Partenaire', extrait: "Intéressé par le parcours leadership.", temps: 'Il y a 2 h', color: '#8B5CF6' },
      { nom: 'Grâce N.', type: 'Contact', extrait: 'Première visite, je suis touchée 🙏', temps: 'Il y a 3 h', color: '#0EA5E9' },
    ],

    alertesTechniques: [
      { niveau: 'ok', titre: 'Build de production', detail: 'Dernier déploiement réussi', temps: 'il y a 2 h' },
      { niveau: 'ok', titre: 'FluentCRM', detail: 'Connexion API active', temps: 'il y a 5 min' },
      { niveau: 'warn', titre: 'Cache images', detail: '3 héros du tunnel manquants (dégradé de repli actif)', temps: 'il y a 1 j' },
      { niveau: 'ok', titre: 'Paiements (Chariow)', detail: 'Liens & widgets de don opérationnels', temps: 'il y a 10 min' },
    ],

    tendance: buildTrend(range),
  }
}

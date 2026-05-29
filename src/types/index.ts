// ============================================
// CIER Platform - Core Type Definitions
// ============================================

import type { LucideIcon } from 'lucide-react'

// --- USER & AUTH ---

export type UserRole =
  | 'visiteur'
  | 'membre'
  | 'disciple'
  | 'leader'
  | 'berger'
  | 'pasteur'
  | 'admin'
  | 'super_admin'

export type UserStatus = 'actif' | 'inactif' | 'suspendu' | 'en_attente'

export type MembreStatut =
  | 'visiteur'
  | 'nouveau_membre'
  | 'membre_actif'
  | 'disciple'
  | 'leader_cellule'
  | 'berger'
  | 'pasteur'

export interface User {
  id: string
  email: string
  nom: string
  prenom: string
  avatar_url?: string
  telephone?: string
  pays?: string
  ville?: string
  role: UserRole
  statut: UserStatus
  membre_statut: MembreStatut
  plateforme_principale?: PlatformeId
  date_inscription: string
  derniere_connexion?: string
  score_engagement: number
  parcours_disciple_etape: number
  notifications_push: boolean
  notifications_email: boolean
  preferences: UserPreferences
  profil_spirituel: ProfilSpirituel
}

export interface UserPreferences {
  langue: 'fr' | 'en' | 'es' | 'pt'
  theme: 'dark' | 'light'
  newsletter: boolean
  sms_alerts: boolean
  whatsapp_alerts: boolean
}

export interface ProfilSpirituel {
  don_spirituel?: string[]
  annee_conversion?: number
  groupe_cellule?: string
  berger_nom?: string
  baptise: boolean
  date_bapteme?: string
  integre_via?: string
  notes_pastorales?: string
}

// --- PLATEFORMES ---

export type PlatformeId =
  | 'cier'
  | 'chapelle-familiale'
  | 'jeunesse'
  | 'femmes-exceptions'
  | 'cite-refuge'
  | 'cfic'
  | 'mahanaim'
  | 'familles-chapelle'

export interface Plateforme {
  id: PlatformeId
  nom: string
  slogan: string
  description: string
  couleur_primaire: string
  couleur_secondaire: string
  icone: string
  image_hero: string
  responsable: string
  membres_count: number
  actif: boolean
}

// --- FORMATIONS / LMS ---

export type FormationStatut = 'brouillon' | 'publie' | 'archive'
export type FormationNiveau = 'debutant' | 'intermediaire' | 'avance' | 'expert'
export type FormationType = 'cours' | 'atelier' | 'certification' | 'parcours' | 'masterclass'

export interface Formation {
  id: string
  titre: string
  description: string
  contenu_court: string
  instructeur_id: string
  instructeur_nom: string
  instructeur_avatar?: string
  plateforme_id?: PlatformeId
  type: FormationType
  niveau: FormationNiveau
  statut: FormationStatut
  image_couverture: string
  duree_heures: number
  modules: Module[]
  prix?: number
  gratuit: boolean
  certifiant: boolean
  prerequis?: string[]
  objectifs: string[]
  inscrits_count: number
  note_moyenne: number
  avis_count: number
  tags: string[]
  date_creation: string
  date_publication?: string
}

export interface Module {
  id: string
  formation_id: string
  titre: string
  description?: string
  ordre: number
  lecons: Lecon[]
  quiz?: Quiz
  duree_minutes: number
}

export interface Lecon {
  id: string
  module_id: string
  titre: string
  type: 'video' | 'audio' | 'texte' | 'pdf' | 'quiz' | 'live'
  contenu_url?: string
  contenu_texte?: string
  duree_minutes: number
  ordre: number
  gratuite: boolean
  completee?: boolean
}

export interface Quiz {
  id: string
  titre: string
  questions: QuizQuestion[]
  score_min_passage: number
}

export interface QuizQuestion {
  id: string
  question: string
  type: 'choix_unique' | 'choix_multiple' | 'vrai_faux' | 'texte_libre'
  options?: string[]
  reponse_correcte: string | string[]
  explication?: string
  points: number
}

export interface InscriptionFormation {
  id: string
  user_id: string
  formation_id: string
  date_inscription: string
  progression: number
  statut: 'actif' | 'termine' | 'abandonne'
  certificat_url?: string
  dernier_acces?: string
  lecons_completees: string[]
  score_quiz?: number
}

// --- ÉVÉNEMENTS ---

export type EvenementType =
  | 'culte'
  | 'conference'
  | 'retraite'
  | 'formation'
  | 'concert'
  | 'jeune'
  | 'evangelisation'
  | 'cellule'
  | 'special'

export interface Evenement {
  id: string
  titre: string
  description: string
  type: EvenementType
  plateforme_id?: PlatformeId
  date_debut: string
  date_fin: string
  lieu?: string
  lieu_virtuel_url?: string
  image_couverture: string
  organisateur_id: string
  capacite_max?: number
  inscrits_count: number
  est_gratuit: boolean
  prix?: number
  est_en_ligne: boolean
  est_en_presentiel: boolean
  stream_url?: string
  statut: 'brouillon' | 'publie' | 'annule' | 'termine'
  tags: string[]
  date_creation: string
}

// --- PRIÈRE ---

export type PriereStatut = 'active' | 'repondue' | 'archivee'
export type PriereVisibilite = 'public' | 'prive' | 'groupe'

export interface DemandePriere {
  id: string
  user_id: string
  user_nom: string
  user_avatar?: string
  sujet: string
  description: string
  visibilite: PriereVisibilite
  statut: PriereStatut
  urgent: boolean
  nombre_priants: number
  temoignage?: string
  date_creation: string
  date_reponse?: string
  tags: string[]
}

// --- DONS ---

export type DonType = 'don' | 'dime' | 'offrande' | 'promesse' | 'partenariat' | 'projet'
export type DonStatut = 'en_attente' | 'complete' | 'echoue' | 'rembourse'
export type DonFrequence = 'unique' | 'mensuel' | 'trimestriel' | 'annuel'

export interface Don {
  id: string
  user_id?: string
  user_nom: string
  user_email: string
  montant: number
  devise: string
  type: DonType
  frequence: DonFrequence
  statut: DonStatut
  message?: string
  anonyme: boolean
  campagne_id?: string
  methode_paiement: string
  stripe_payment_intent_id?: string
  recu_envoye: boolean
  date_creation: string
}

export interface Campagne {
  id: string
  titre: string
  description: string
  image_couverture: string
  objectif_montant: number
  montant_collecte: number
  date_debut: string
  date_fin?: string
  statut: 'active' | 'terminee' | 'archivee'
  featured: boolean
}

// --- LIVE STREAM ---

export type LiveStatut = 'planifie' | 'en_direct' | 'pause' | 'termine'

export interface LiveStream {
  id: string
  titre: string
  description?: string
  miniature_url?: string
  stream_url: string
  replay_url?: string
  statut: LiveStatut
  spectateurs_live?: number
  vues_totales: number
  duree_minutes?: number
  speaker_id: string
  speaker_nom: string
  plateforme_id?: PlatformeId
  date_programmee?: string
  date_debut?: string
  date_fin?: string
  chat_actif: boolean
  prieres_activees: boolean
  reactions_activees: boolean
  enregistrement_url?: string
}

export interface MessageLive {
  id: string
  live_id: string
  user_id: string
  user_nom: string
  user_avatar?: string
  user_role: UserRole
  contenu: string
  type: 'message' | 'priere' | 'temoignage' | 'reaction' | 'systeme'
  reaction?: string
  approuve: boolean
  date: string
}

// --- CRM ---

export type CRMTag =
  | 'nouveau_visiteur'
  | 'prospect_chaud'
  | 'en_integration'
  | 'membre_fidele'
  | 'leader_potentiel'
  | 'partenaire'
  | 'inactif_risque'
  | 'perdu'

export interface CRMContact {
  id: string
  user_id?: string
  nom: string
  prenom: string
  email: string
  telephone?: string
  pays?: string
  source: string
  tags: CRMTag[]
  score: number
  etape_pipeline: string
  dernier_contact?: string
  prochaine_action?: string
  notes: string
  date_creation: string
  historique: CRMInteraction[]
}

export interface CRMInteraction {
  id: string
  contact_id: string
  type: 'email' | 'appel' | 'sms' | 'whatsapp' | 'rdv' | 'evenement' | 'don' | 'formation'
  description: string
  auteur_id: string
  date: string
}

// --- GROUPES / CELLULES ---

export interface Groupe {
  id: string
  nom: string
  description?: string
  type: 'cellule' | 'groupe_priere' | 'equipe_service' | 'formation' | 'departement'
  plateforme_id?: PlatformeId
  leader_id: string
  membres: string[]
  membres_count: number
  lieu_reunion?: string
  jour_reunion?: string
  heure_reunion?: string
  est_virtuel: boolean
  reunion_url?: string
  image?: string
  statut: 'actif' | 'inactif'
  date_creation: string
}

// --- NOTIFICATIONS ---

export type NotificationType =
  | 'live_commence'
  | 'nouvel_evenement'
  | 'priere_repondue'
  | 'formation_disponible'
  | 'message_groupe'
  | 'rdv_rappel'
  | 'badge_obtenu'
  | 'progression_formation'
  | 'nouveau_temoignage'
  | 'systeme'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  titre: string
  message: string
  lien?: string
  lue: boolean
  date: string
  data?: Record<string, unknown>
}

// --- GAMIFICATION ---

export interface Badge {
  id: string
  nom: string
  description: string
  /** Lucide icon component used as the badge artwork. */
  icone: LucideIcon
  couleur: string
  condition: string
  points: number
  rare: boolean
}

export interface UserBadge {
  user_id: string
  badge_id: string
  badge: Badge
  date_obtenu: string
}

// --- NAVIGATION ---

export interface NavItem {
  label: string
  href: string
  icon?: string
  children?: NavItem[]
  badge?: string
  new?: boolean
}

// --- API RESPONSES ---

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// --- ANALYTICS ---

export interface AnalyticsData {
  periode: string
  visiteurs_uniques: number
  nouveaux_membres: number
  membres_actifs: number
  vues_lives: number
  formations_completees: number
  dons_total: number
  taux_retention: number
  taux_conversion: number
  top_pays: { pays: string; count: number }[]
  croissance_membres: { date: string; count: number }[]
}

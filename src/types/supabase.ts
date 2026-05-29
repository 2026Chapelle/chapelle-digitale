/**
 * CIER Platform — Supabase Database Types
 *
 * Typage de la base Postgres pour le client typé `supabase-js`.
 *
 * ⚠️ Ce fichier est maintenu à la main pour couvrir les tables principales et
 * permettre un typage fort SANS base locale en cours d'exécution.
 *
 * Pour régénérer la version COMPLÈTE depuis la vraie base (recommandé une fois
 * Supabase configuré) :
 *
 *     npm run db:generate
 *
 * (ce qui écrase ce fichier avec le schéma réel, vues + fonctions incluses).
 *
 * Source de vérité du schéma : supabase/migrations/*.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// ENUMS (cf. migration 001)
// ---------------------------------------------------------------------------

export type UserRole =
  | 'visiteur' | 'membre' | 'disciple' | 'leader' | 'berger' | 'pasteur' | 'admin' | 'super_admin'
export type UserStatus = 'actif' | 'inactif' | 'suspendu' | 'en_attente'
export type MembreStatut =
  | 'visiteur' | 'nouveau_membre' | 'membre_actif' | 'disciple' | 'leader_cellule' | 'berger' | 'pasteur'
export type FormationType = 'cours' | 'atelier' | 'certification' | 'parcours' | 'masterclass'
export type FormationNiveau = 'debutant' | 'intermediaire' | 'avance' | 'expert'
export type EvenementType =
  | 'culte' | 'conference' | 'retraite' | 'formation' | 'concert' | 'jeune' | 'evangelisation' | 'cellule' | 'special'
export type DonType = 'don' | 'dime' | 'offrande' | 'promesse' | 'partenariat' | 'projet'
export type DonStatut = 'en_attente' | 'complete' | 'echoue' | 'rembourse'
export type DonFrequence = 'unique' | 'mensuel' | 'trimestriel' | 'annuel'
export type PriereStatut = 'active' | 'repondue' | 'archivee'
export type PriereVisibilite = 'public' | 'prive' | 'groupe'
export type LiveStatut = 'planifie' | 'en_direct' | 'pause' | 'termine'
export type NotificationType =
  | 'live_commence' | 'nouvel_evenement' | 'priere_repondue' | 'formation_disponible'
  | 'message_groupe' | 'rdv_rappel' | 'badge_obtenu' | 'progression_formation'
  | 'nouveau_temoignage' | 'systeme'
export type PlateformeId =
  | 'cier' | 'chapelle-familiale' | 'jeunesse' | 'femmes-exceptions'
  | 'cite-refuge' | 'cfic' | 'mahanaim' | 'familles-chapelle'

// ---------------------------------------------------------------------------
// ROW TYPES
// ---------------------------------------------------------------------------

export interface ProfileRow {
  id: string
  email: string
  prenom: string
  nom: string
  avatar_url: string | null
  telephone: string | null
  pays: string | null
  ville: string | null
  role: UserRole
  statut: UserStatus
  membre_statut: MembreStatut
  plateforme_principale: PlateformeId | null
  score_engagement: number
  parcours_disciple_etape: number
  dons_spirituels: string[]
  annee_conversion: number | null
  groupe_cellule_id: string | null
  berger_id: string | null
  baptise: boolean
  date_bapteme: string | null
  integre_via: string | null
  comment_entendu: string | null
  langue: string
  notifications_push: boolean
  notifications_email: boolean
  newsletter: boolean
  whatsapp_alerts: boolean
  date_inscription: string
  derniere_connexion: string | null
  ip_inscription: string | null
  source_inscription: string | null
  created_at: string
  updated_at: string
}

export interface FormationRow {
  id: string
  titre: string
  slug: string
  description: string
  contenu_court: string
  instructeur_id: string | null
  instructeur_nom: string
  instructeur_avatar: string | null
  plateforme_id: PlateformeId | null
  type: FormationType
  niveau: FormationNiveau
  statut: 'brouillon' | 'publie' | 'archive'
  image_couverture: string | null
  duree_heures: number
  prix: number | null
  gratuit: boolean
  certifiant: boolean
  prerequis: string[]
  objectifs: string[]
  inscrits_count: number
  note_moyenne: number | null
  avis_count: number
  tags: string[]
  meta_titre: string | null
  meta_description: string | null
  date_publication: string | null
  created_at: string
  updated_at: string
}

export interface InscriptionFormationRow {
  id: string
  user_id: string
  formation_id: string
  progression: number
  statut: 'actif' | 'termine' | 'abandonne'
  lecons_completees: string[]
  score_quiz: number | null
  certificat_url: string | null
  dernier_acces: string | null
  date_inscription: string
  date_completion: string | null
}

export interface DemandePriereRow {
  id: string
  user_id: string | null
  user_nom: string
  user_avatar: string | null
  sujet: string
  description: string
  visibilite: PriereVisibilite
  statut: PriereStatut
  urgent: boolean
  nombre_priants: number
  temoignage: string | null
  tags: string[]
  date_creation: string
  date_reponse: string | null
}

export interface PriantRow {
  user_id: string
  demande_id: string
  date: string
}

export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  titre: string
  message: string
  lien: string | null
  lue: boolean
  data: Json
  date: string
}

export interface DonRow {
  id: string
  user_id: string | null
  user_nom: string
  user_email: string
  montant: number
  devise: string
  type: DonType
  frequence: DonFrequence
  statut: DonStatut
  message: string | null
  anonyme: boolean
  campagne_id: string | null
  methode_paiement: string
  stripe_payment_intent_id: string | null
  stripe_subscription_id: string | null
  recu_envoye: boolean
  date_creation: string
}

export interface EvenementRow {
  id: string
  titre: string
  description: string
  type: EvenementType
  plateforme_id: PlateformeId | null
  date_debut: string
  date_fin: string
  lieu: string | null
  lieu_virtuel_url: string | null
  image_couverture: string | null
  organisateur_id: string | null
  capacite_max: number | null
  inscrits_count: number
  est_gratuit: boolean
  prix: number | null
  est_en_ligne: boolean
  est_en_presentiel: boolean
  stream_url: string | null
  statut: 'brouillon' | 'publie' | 'annule' | 'termine'
  tags: string[]
  created_at: string
  updated_at: string
}

export interface LiveStreamRow {
  id: string
  titre: string
  description: string | null
  miniature_url: string | null
  stream_url: string
  replay_url: string | null
  statut: LiveStatut
  spectateurs_live: number | null
  vues_totales: number
  duree_minutes: number | null
  speaker_id: string | null
  speaker_nom: string
  plateforme_id: PlateformeId | null
  date_programmee: string | null
  date_debut: string | null
  date_fin: string | null
  chat_actif: boolean
  prieres_activees: boolean
  reactions_activees: boolean
  youtube_video_id: string | null
  created_at: string
}

export interface GroupeRow {
  id: string
  nom: string
  description: string | null
  type: 'cellule' | 'groupe_priere' | 'equipe_service' | 'formation' | 'departement'
  plateforme_id: PlateformeId | null
  leader_id: string | null
  membres_count: number
  lieu_reunion: string | null
  jour_reunion: string | null
  heure_reunion: string | null
  est_virtuel: boolean
  reunion_url: string | null
  image: string | null
  statut: 'actif' | 'inactif'
  created_at: string
}

export interface MembreGroupeRow {
  user_id: string
  groupe_id: string
  role: 'leader' | 'co-leader' | 'membre'
  date_adhesion: string
}

export interface UserBadgeRow {
  user_id: string
  badge_id: string
  date_obtenu: string
}

export interface JournalSpirituelRow {
  id: string
  user_id: string
  titre: string
  contenu: string
  humeur: 'joie' | 'paix' | 'force' | 'lutte' | 'gratitude' | 'intercession' | null
  verset_reference: string | null
  prive: boolean
  date: string
}

export interface RendezVousRow {
  id: string
  demandeur_id: string
  pasteur_id: string | null
  sujet: string
  description: string
  date_souhaitee: string | null
  date_confirmee: string | null
  type: 'priere' | 'accompagnement' | 'conseil' | 'delivrance' | 'autre'
  statut: 'en_attente' | 'confirme' | 'refuse' | 'realise' | 'annule'
  notes_pasteur: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// DATABASE — shape attendue par le client supabase-js
// ---------------------------------------------------------------------------

type TableShape<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<ProfileRow>
      formations: TableShape<FormationRow>
      inscriptions_formation: TableShape<InscriptionFormationRow>
      demandes_priere: TableShape<DemandePriereRow>
      priants: TableShape<PriantRow>
      notifications: TableShape<NotificationRow>
      dons: TableShape<DonRow>
      evenements: TableShape<EvenementRow>
      live_streams: TableShape<LiveStreamRow>
      groupes: TableShape<GroupeRow>
      membres_groupe: TableShape<MembreGroupeRow>
      user_badges: TableShape<UserBadgeRow>
      journal_spirituel: TableShape<JournalSpirituelRow>
      rendez_vous: TableShape<RendezVousRow>
    }
    Views: { [_ in never]: never }
    Functions: {
      calculate_engagement_score: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      membre_statut: MembreStatut
      formation_type: FormationType
      formation_niveau: FormationNiveau
      evenement_type: EvenementType
      don_type: DonType
      don_statut: DonStatut
      don_frequence: DonFrequence
      priere_statut: PriereStatut
      priere_visibilite: PriereVisibilite
      live_statut: LiveStatut
      notification_type: NotificationType
      plateforme_id: PlateformeId
    }
    CompositeTypes: { [_ in never]: never }
  }
}

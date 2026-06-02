/**
 * TUNNEL D'INTÉGRATION ROYAL — modèle de données central.
 *
 * Définit les 7 étapes du parcours de transformation du visiteur en leader,
 * ainsi que les métadonnées utilisées par les pages publiques (/parcours,
 * /integration, /communaute, /servir, /partenaires) et par le dashboard
 * membre (indicateur de progression).
 *
 * Aligné sur l'identité « Charbon & Lumière » : or royal #D4AF37 dominant,
 * accents violet royal #4B0082, fond charbon #050308.
 *
 * NB : volontairement séparé de PARCOURS_DISCIPLE (constants.ts) pour ne rien
 * casser dans le dashboard existant — ce module est additif.
 */
import type { LucideIcon } from 'lucide-react'
import {
  Eye, Mail, Sparkles, BookOpen, Users, HandHeart, Crown,
} from 'lucide-react'

export type TunnelStageKey =
  | 'visiteur'
  | 'contact'
  | 'integration'
  | 'disciple'
  | 'membre'
  | 'serviteur'
  | 'leader'

export interface TunnelStage {
  /** Index 0-6 dans le parcours. */
  index: number
  key: TunnelStageKey
  /** Nom affiché. */
  nom: string
  /** Sous-titre court. */
  role: string
  /** Promesse / objectif de transformation à cette étape. */
  promesse: string
  /** Ce que la plateforme déclenche à cette étape (job-to-be-done). */
  declencheur: string
  /** Étiquette FluentCRM appliquée au contact à cette étape. */
  crmTag: string
  /** Page publique principale associée. */
  href: string
  /** CTA principal de l'étape. */
  cta: string
  icon: LucideIcon
  /** Couleur d'accent (hex). */
  color: string
  /** Emoji rituel (usage décoratif léger). */
  emoji: string
}

export const TUNNEL_STAGES: TunnelStage[] = [
  {
    index: 0,
    key: 'visiteur',
    nom: 'Visiteur',
    role: 'Celui qui découvre',
    promesse: 'Être touché dès le premier regard.',
    declencheur: 'Culte en direct, ressources gratuites, première émotion.',
    crmTag: 'tunnel:visiteur',
    href: '/',
    cta: 'Découvrir la Chapelle',
    icon: Eye,
    color: '#9CA3AF',
    emoji: '👁️',
  },
  {
    index: 1,
    key: 'contact',
    nom: 'Contact',
    role: 'Celui qui lève la main',
    promesse: 'Être accueilli personnellement, pas comme un numéro.',
    declencheur: 'Formulaire de premier contact, mot de bienvenue, prière dédiée.',
    crmTag: 'tunnel:contact',
    href: '/rejoindre',
    cta: 'Faire le premier pas',
    icon: Mail,
    color: '#0EA5E9',
    emoji: '✉️',
  },
  {
    index: 2,
    key: 'integration',
    nom: 'Intégration',
    role: 'Le nouvel arrivant',
    promesse: 'Trouver sa place et ne plus être seul.',
    declencheur: 'Parcours nouveau arrivant, rattachement à une cellule, mentor.',
    crmTag: 'tunnel:integration',
    href: '/integration',
    cta: "Commencer mon intégration",
    icon: Sparkles,
    color: '#818CF8',
    emoji: '🤝',
  },
  {
    index: 3,
    key: 'disciple',
    nom: 'Disciple',
    role: 'Celui qui grandit',
    promesse: 'Être affermi par la Parole et la formation.',
    declencheur: 'Parcours de formation, suivi de progression, certification.',
    crmTag: 'tunnel:disciple',
    href: '/parcours',
    cta: 'Suivre mon parcours',
    icon: BookOpen,
    color: '#D4AF37',
    emoji: '📖',
  },
  {
    index: 4,
    key: 'membre',
    nom: 'Membre',
    role: 'Celui qui appartient',
    promesse: 'Faire partie de la famille du Royaume.',
    declencheur: 'Engagement communautaire, cellules, événements, groupes.',
    crmTag: 'tunnel:membre',
    href: '/communaute',
    cta: 'Rejoindre la communauté',
    icon: Users,
    color: '#22C55E',
    emoji: '🫂',
  },
  {
    index: 5,
    key: 'serviteur',
    nom: 'Serviteur',
    role: 'Celui qui donne',
    promesse: 'Mettre ses dons au service du Royaume.',
    declencheur: 'Équipes de service, bénévolat, partenariat, dons.',
    crmTag: 'tunnel:serviteur',
    href: '/servir',
    cta: 'Servir dans une équipe',
    icon: HandHeart,
    color: '#F97316',
    emoji: '🙌',
  },
  {
    index: 6,
    key: 'leader',
    nom: 'Leader',
    role: 'Celui qui élève',
    promesse: 'Conduire et reproduire des disciples.',
    declencheur: 'Mentorat, école de leaders, partenariat stratégique.',
    crmTag: 'tunnel:leader',
    href: '/partenaires',
    cta: 'Devenir partenaire & leader',
    icon: Crown,
    color: '#8B5CF6',
    emoji: '👑',
  },
]

export const TUNNEL_BY_KEY: Record<TunnelStageKey, TunnelStage> = TUNNEL_STAGES.reduce(
  (acc, s) => ({ ...acc, [s.key]: s }),
  {} as Record<TunnelStageKey, TunnelStage>,
)

/** Étape suivante du tunnel (ou null si déjà au sommet). */
export function nextStage(key: TunnelStageKey): TunnelStage | null {
  const s = TUNNEL_BY_KEY[key]
  return TUNNEL_STAGES[s.index + 1] ?? null
}

/** Progression 0-100 sur l'ensemble du tunnel pour une étape donnée. */
export function tunnelProgress(key: TunnelStageKey): number {
  const s = TUNNEL_BY_KEY[key]
  return Math.round((s.index / (TUNNEL_STAGES.length - 1)) * 100)
}

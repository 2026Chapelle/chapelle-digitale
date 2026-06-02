import type { Plateforme, PlatformeId, Badge } from '@/types'
import {
  Sprout, Star, Heart, BookOpen, GraduationCap, Coins,
  Sparkles, Crown, Building2, Zap,
} from 'lucide-react'

export const APP_NAME = 'La Chapelle Internationale des Élus du Royaume'
export const APP_SHORT_NAME = 'CIER'
export const APP_SLOGAN = 'Une Église Ouverte au Monde'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'
export const APP_EMAIL = 'info@chapelleduroyaume.org'

// Navigation
export const NAV_HEIGHT = 80

// Pagination
export const DEFAULT_PAGE_SIZE = 12

// PLATEFORMES DEFINITION
export const PLATEFORMES: Record<PlatformeId, Plateforme> = {
  cier: {
    id: 'cier',
    nom: 'CIER',
    slogan: 'La Chapelle Internationale des Élus du Royaume',
    description: 'Le corps central de notre église mondiale. Un espace de culte, de formation et de communion pour tous les croyants.',
    couleur_primaire: '#D4AF37',
    couleur_secondaire: '#4B0082',
    icone: '⛪',
    image_hero: '/images/platforms/cier-hero.jpg',
    responsable: 'Pasteur Principal',
    membres_count: 0,
    actif: true,
  },
  'chapelle-familiale': {
    id: 'chapelle-familiale',
    nom: 'La Chapelle Familiale',
    slogan: 'Construire des familles selon le cœur de Dieu',
    description: 'Un ministère dédié au renforcement des familles chrétiennes. Couples, parents et enfants grandissent ensemble dans la foi.',
    couleur_primaire: '#F97316',
    couleur_secondaire: '#7C2D12',
    icone: '👨‍👩‍👧‍👦',
    image_hero: '/images/platforms/famille-hero.jpg',
    responsable: 'Pasteur Famille',
    membres_count: 0,
    actif: true,
  },
  jeunesse: {
    id: 'jeunesse',
    nom: 'Jeunesse',
    slogan: 'La génération qui change le monde',
    description: 'Un espace dynamique et créatif pour la nouvelle génération. Worship, formation, impacts sociaux et communauté vibrante.',
    couleur_primaire: '#9333EA',
    couleur_secondaire: '#4C1D95',
    icone: '🔥',
    image_hero: '/images/platforms/jeunesse-hero.jpg',
    responsable: 'Pasteur Jeunesse',
    membres_count: 0,
    actif: true,
  },
  'femmes-exceptions': {
    id: 'femmes-exceptions',
    nom: 'Femmes d\'Exceptions',
    slogan: 'Des femmes d\'exception pour un royaume exceptionnel',
    description: 'Un ministère puissant pour les femmes de valeur. Identité, leadership, famille, ministère — grandir en grâce et en autorité.',
    couleur_primaire: '#EC4899',
    couleur_secondaire: '#831843',
    icone: '👑',
    image_hero: '/images/platforms/femmes-hero.jpg',
    responsable: 'Pasteure Femmes',
    membres_count: 0,
    actif: true,
  },
  'cite-refuge': {
    id: 'cite-refuge',
    nom: 'Cité du Refuge',
    slogan: 'Un refuge pour les blessés de la vie',
    description: 'Ministère de restauration et d\'accompagnement. Un espace sûr pour guérir, se relever et retrouver son identité en Christ.',
    couleur_primaire: '#14B8A6',
    couleur_secondaire: '#134E4A',
    icone: '🏠',
    image_hero: '/images/platforms/refuge-hero.jpg',
    responsable: 'Pasteur Pastoral',
    membres_count: 0,
    actif: true,
  },
  cfic: {
    id: 'cfic',
    nom: 'CFIC',
    slogan: 'Centre de Formation Internationale de la Chapelle',
    description: 'Notre école de formation biblique et ministérielle. Cours théologiques, formation de leaders, certification et excellence académique.',
    couleur_primaire: '#8B5CF6',
    couleur_secondaire: '#4C1D95',
    icone: '📖',
    image_hero: '/images/platforms/cfic-hero.jpg',
    responsable: 'Directeur CFIC',
    membres_count: 0,
    actif: true,
  },
  mahanaim: {
    id: 'mahanaim',
    nom: 'Mahanaïm',
    slogan: 'Le camp des anges — Intercesseurs du Royaume',
    description: 'Ministère d\'intercession et de prière. 24/7 — Un camp de guerriers spirituels qui tiennent le mur de prière pour l\'Église mondiale.',
    couleur_primaire: '#7C3AED',
    couleur_secondaire: '#3B0764',
    icone: '🙏',
    image_hero: '/images/platforms/mahanaim-hero.jpg',
    responsable: 'Pasteur Intercession',
    membres_count: 0,
    actif: true,
  },
  'familles-chapelle': {
    id: 'familles-chapelle',
    nom: 'Familles de la Chapelle',
    slogan: 'Ensemble, nous sommes la famille de Dieu',
    description: 'Le système de cellules et de familles spirituelles. Groupes intimes de croissance, de soutien mutuel et d\'évangélisation.',
    couleur_primaire: '#22C55E',
    couleur_secondaire: '#14532D',
    icone: '💚',
    image_hero: '/images/platforms/familles-hero.jpg',
    responsable: 'Pasteur Cellules',
    membres_count: 0,
    actif: true,
  },
}

// BADGES SYSTEM
export const BADGES: Badge[] = [
  {
    id: 'premier_pas',
    nom: 'Premier Pas',
    description: 'A rejoint la communauté CIER',
    icone: Sprout,
    couleur: '#22C55E',
    condition: 'inscription',
    points: 10,
    rare: false,
  },
  {
    id: 'fidele',
    nom: 'Fidèle',
    description: 'Connecté 30 jours consécutifs',
    icone: Star,
    couleur: '#D4AF37',
    condition: 'login_30_streak',
    points: 50,
    rare: false,
  },
  {
    id: 'intercesseur',
    nom: 'Intercesseur',
    description: 'A soumis 50 demandes de prière',
    icone: Heart,
    couleur: '#7C3AED',
    condition: 'prayers_50',
    points: 30,
    rare: false,
  },
  {
    id: 'etudiant_royaume',
    nom: 'Étudiant du Royaume',
    description: 'A complété sa première formation',
    icone: BookOpen,
    couleur: '#8B5CF6',
    condition: 'formation_completed_1',
    points: 40,
    rare: false,
  },
  {
    id: 'maitre_formation',
    nom: 'Maître de la Formation',
    description: 'A complété 10 formations',
    icone: GraduationCap,
    couleur: '#D4AF37',
    condition: 'formation_completed_10',
    points: 200,
    rare: true,
  },
  {
    id: 'donateur',
    nom: 'Donateur Fidèle',
    description: 'Partenaire financier de l\'église',
    icone: Coins,
    couleur: '#F59E0B',
    condition: 'donation_first',
    points: 25,
    rare: false,
  },
  {
    id: 'evangeliste',
    nom: 'Évangéliste',
    description: 'A invité 5 amis dans la communauté',
    icone: Sparkles,
    couleur: '#EC4899',
    condition: 'referral_5',
    points: 75,
    rare: false,
  },
  {
    id: 'leader',
    nom: 'Leader Émergent',
    description: 'A animé un groupe de cellule',
    icone: Crown,
    couleur: '#D4AF37',
    condition: 'group_leader',
    points: 100,
    rare: true,
  },
  {
    id: 'pilier',
    nom: 'Pilier de l\'Église',
    description: 'Membre actif depuis 1 an',
    icone: Building2,
    couleur: '#8B5CF6',
    condition: 'member_1_year',
    points: 150,
    rare: true,
  },
  {
    id: 'apotre_digital',
    nom: 'Apôtre Digital',
    description: 'Score d\'engagement maximum atteint',
    icone: Zap,
    couleur: '#D4AF37',
    condition: 'score_100',
    points: 500,
    rare: true,
  },
]

// PARCOURS DISCIPLE ÉTAPES
export const PARCOURS_DISCIPLE = [
  { etape: 0, nom: 'Visiteur', description: 'Découverte de la Chapelle', couleur: '#6B7280' },
  { etape: 1, nom: 'Nouvel Arrivant', description: 'Intégration en cours', couleur: '#818CF8' },
  { etape: 2, nom: 'Membre', description: 'Membre de la famille', couleur: '#22C55E' },
  { etape: 3, nom: 'Disciple', description: 'En formation active', couleur: '#D4AF37' },
  { etape: 4, nom: 'Leader de Cellule', description: 'Guide ses frères', couleur: '#F59E0B' },
  { etape: 5, nom: 'Berger', description: 'Responsable de familles', couleur: '#8B5CF6' },
  { etape: 6, nom: 'Pasteur', description: 'Consacré au ministère', couleur: '#D4AF37' },
]

// PAYS PRIORITAIRES
export const PAYS_AFRICAINS = [
  'Congo (RDC)', 'Congo (Brazzaville)', 'Côte d\'Ivoire', 'Cameroun', 'Sénégal',
  'Mali', 'Burkina Faso', 'Gabon', 'Togo', 'Bénin', 'Niger', 'Guinée',
  'Madagascar', 'Rwanda', 'Burundi', 'Centrafrique', 'Tchad', 'Comores',
  'Djibouti', 'Mauritanie', 'Seychelles',
]

export const PAYS_DIASPORA = [
  'France', 'Belgique', 'Suisse', 'Canada', 'USA', 'Royaume-Uni',
  'Luxembourg', 'Pays-Bas', 'Allemagne', 'Espagne', 'Portugal', 'Italie',
  'Australie', 'Brésil', 'Dubaï',
]

// RÉSEAUX SOCIAUX
export const SOCIAL_LINKS = {
  youtube: 'https://youtube.com/@cier',
  facebook: 'https://facebook.com/cier',
  instagram: 'https://instagram.com/cier',
  tiktok: 'https://tiktok.com/@cier',
  whatsapp: 'https://wa.me/message/cier',
  telegram: 'https://t.me/cier',
  twitter: 'https://twitter.com/cier',
}

// PLANS MEMBRES
export const PLANS_MEMBRE = {
  gratuit: {
    nom: 'Membre Gratuit',
    prix: 0,
    fonctionnalites: [
      'Accès aux cultes en direct',
      'Communauté de base',
      '5 formations gratuites',
      'Mur de prière',
      'Profil spirituel',
    ],
  },
  disciple: {
    nom: 'Disciple Premium',
    prix: 5000,
    devise: 'FCFA/mois',
    fonctionnalites: [
      'Tout ce qui est gratuit +',
      'Accès illimité aux formations',
      'Certifications officielles',
      'Coaching personnel',
      'Groupe dédié',
      'Replays illimités',
      'Ressources premium',
      'Support prioritaire',
    ],
  },
  partenaire: {
    nom: 'Partenaire du Royaume',
    prix: 25000,
    devise: 'FCFA/mois',
    fonctionnalites: [
      'Tout Premium +',
      'Masterclass exclusives',
      'Accès pasteurs en direct',
      'Prière personnelle mensuelle',
      'Badge Partenaire',
      'Accès anticipé nouveautés',
      'Reçu fiscal annuel',
    ],
  },
}

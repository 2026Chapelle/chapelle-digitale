/**
 * ACADÉMIE DES ÉLUS — programme principal du CFIC.
 *
 * Structure OFFICIELLE : 6 niveaux × 20 modules = 120 modules.
 * Ce fichier porte la VÉRITÉ STRUCTURELLE (noms de niveaux, métadonnées des
 * modules réels) — il sert de seed/fallback ; le contenu pédagogique réel
 * (PDF, vidéo, quiz) est géré en base/CMS. AUCUN enseignement n'est inventé :
 * les modules sans ressources réelles restent des emplacements `planned`.
 *
 * Données réelles intégrées :
 *  - Niveau 1 « Fondements du Royaume » → Module 1 (prêt) + Module 2 (verrouillé).
 *  - Les ressources réelles du Module 1 (PDF, couverture, miniature, quiz, badge
 *    « Né du Royaume », passeport) seront branchées une fois déposées dans le
 *    projet / la base (cf. architecture LMS).
 */
import type { Programme, ParcoursLevel, ParcoursStep } from './types'

// Niveaux officiels (validés).
const NIVEAUX = [
  { id: 'fondements',        ordre: 1, titre: 'Niveau 1 · Fondements du Royaume',                 theme: 'Fondements',          couleur: '#D4AF37' },
  { id: 'identite-heritage', ordre: 2, titre: 'Niveau 2 · Identité et Héritage des Fils',         theme: 'Identité & Héritage', couleur: '#22C55E' },
  { id: 'gouvernement',      ordre: 3, titre: 'Niveau 3 · Gouvernement du Royaume',               theme: 'Gouvernement',        couleur: '#0EA5E9' },
  { id: 'puissance',         ordre: 4, titre: 'Niveau 4 · Puissance et Manifestation du Royaume', theme: 'Puissance',           couleur: '#F97316' },
  { id: 'destinee-mission',  ordre: 5, titre: 'Niveau 5 · Destinée et Mission',                   theme: 'Destinée & Mission',  couleur: '#8B5CF6' },
  { id: 'batisseurs',        ordre: 6, titre: 'Niveau 6 · Bâtisseurs du Royaume',                 theme: 'Bâtisseurs',          couleur: '#EC4899' },
] as const

const MODULES_PAR_NIVEAU = 20

/** Emplacement `planned` (structure visible, sans contenu inventé). */
function plannedModule(nivId: string, ordre: number): ParcoursStep {
  return {
    id: `acad-${nivId}-m${ordre}`,
    ordre,
    titre: `Module ${ordre}`,
    resume: 'Contenu en cours de préparation par le CFIC.',
    contenu: [],
    unlock: { mode: 'sequential' }, // se débloque quand le module précédent est validé
    xp: 100,
    status: 'planned',
  }
}

// ── Niveau 1 — Fondements du Royaume : modules réels M1 (prêt) et M2 (verrouillé) ──

/** MODULE 1 — réel, prêt. Ressources (PDF/vidéo/quiz/badge) branchées via la base. */
const FONDEMENTS_M1: ParcoursStep = {
  id: 'acad-fondements-m1',
  ordre: 1,
  titre: 'Entrer dans le Royaume',
  sousTitre: 'Le Mystère de la Nouvelle Naissance',
  resume: 'Le mystère de la nouvelle naissance : comment naître de nouveau et entrer réellement dans le Royaume de Dieu.',
  contenu: [], // vidéo YouTube (URL éditable) + PDF officiel — branchés depuis la base/CMS
  // quiz : importé du quiz officiel (non inventé) lors du dépôt des ressources
  badgeId: 'ne-du-royaume',
  xp: 100,
  unlock: { mode: 'open' }, // premier module, toujours accessible
  status: 'published',
}

/** MODULE 2 — fiche réelle, verrouillée jusqu'à validation du Module 1. */
const FONDEMENTS_M2: ParcoursStep = {
  id: 'acad-fondements-m2',
  ordre: 2,
  titre: 'Découvrir le Royaume Invisible',
  sousTitre: 'Le Royaume qui gouverne le monde visible',
  resume: 'Le Royaume invisible qui gouverne le monde visible — comprendre la réalité du Royaume avant ses manifestations.',
  contenu: [], // couverture PDF + couverture vidéo disponibles ; contenu à venir
  xp: 100,
  unlock: { mode: 'sequential' }, // verrouillé tant que le Module 1 n'est pas validé
  status: 'planned',
}

function buildNiveau1Steps(): ParcoursStep[] {
  const rest = Array.from({ length: MODULES_PAR_NIVEAU - 2 }, (_, i) => plannedModule('fondements', i + 3))
  return [FONDEMENTS_M1, FONDEMENTS_M2, ...rest]
}

const niveaux: ParcoursLevel[] = NIVEAUX.map((n): ParcoursLevel => ({
  id: `acad-${n.id}`,
  ordre: n.ordre,
  titre: n.titre,
  theme: n.theme,
  description: `Vingt modules pour intégrer la dimension « ${n.theme} » du Royaume.`,
  couleur: n.couleur,
  steps: n.id === 'fondements'
    ? buildNiveau1Steps()
    : Array.from({ length: MODULES_PAR_NIVEAU }, (_, i) => plannedModule(n.id, i + 1)),
  validation: { toutesEtapes: true, scoreMinMoyen: 70 },
  certificatId: `cert-academie-${n.id}`,
}))

export const PARCOURS_ACADEMIE: Programme = {
  slug: 'academie-des-elus',
  titre: 'Académie des Élus',
  sousTitre: 'Le parcours fondamental du CFIC',
  description: 'Six niveaux de transformation — Fondements, Identité et Héritage des Fils, Gouvernement, Puissance et Manifestation, Destinée et Mission, Bâtisseurs du Royaume. 120 modules pour former des élus établis.',
  type: 'academie',
  plateforme: 'cfic',
  parent: 'cfic',
  couleur: '#D4AF37',
  icone: '👑',
  delivreCertificat: true,
  badgeFinal: 'academie_diplome',
  status: 'planned',
  niveaux,
}

/**
 * ACADÉMIE DES ÉLUS — couche de présentation étudiant.
 *
 * Enrichit la structure du moteur (src/lib/parcours/academie.ts) avec les
 * RESSOURCES RÉELLES déposées dans public/academie/ (couverture, miniature,
 * PDF). AUCUN contenu inventé : seules les ressources réellement présentes
 * sont référencées ; les modules sans ressources restent « structure ».
 *
 * Cette couche est volontairement fine et DB-ready : quand le schéma `academy`
 * sera en base, ces métadonnées proviendront de la base (les composants UI ne
 * changeront pas — ils consomment ces mêmes formes).
 */
import { PARCOURS_ACADEMIE } from '@/lib/parcours/registry'
import { flattenSteps } from '@/lib/parcours/types'

export interface AcademieModuleView {
  slug: string
  stepId: string
  levelId: string
  niveauLabel: string
  niveauCouleur: string
  ordre: number
  titre: string
  sousTitre?: string
  apropos?: string
  cover?: string
  thumbnail?: string
  pdf?: string
  /** URL YouTube — éditable en admin ; vide pour l'instant. */
  videoUrl?: string
  badgeId?: string
  badgeLabel?: string
  hasRealContent: boolean
}

const BASE = '/academie/fondements'

/** Ressources réelles par identifiant d'étape (déposées dans public/academie/). */
const RESOURCES: Record<string, Partial<AcademieModuleView>> = {
  'acad-fondements-m1': {
    slug: 'entrer-dans-le-royaume',
    cover: `${BASE}/m1/couverture.png`,
    thumbnail: `${BASE}/m1/miniature-video.png`,
    pdf: `${BASE}/m1/manuel.pdf`,
    videoUrl: '', // à renseigner en admin (YouTube non répertorié)
    badgeId: 'ne-du-royaume',
    badgeLabel: 'Né du Royaume',
    apropos: "Le mystère de la nouvelle naissance : comprendre comment naître de nouveau et entrer réellement dans le Royaume de Dieu.",
    hasRealContent: true,
  },
  'acad-fondements-m2': {
    slug: 'decouvrir-le-royaume-invisible',
    cover: `${BASE}/m2/couverture.png`,
    thumbnail: `${BASE}/m2/miniature-video.png`,
    badgeLabel: 'Royaume Invisible',
    apropos: "Le Royaume invisible qui gouverne le monde visible : découvrir la réalité du Royaume avant ses manifestations.",
    // PDF + vidéo non encore déposés → reste « à venir » (pas d'impasse de validation).
    hasRealContent: false,
  },
}

/** Slug de secours pour les modules de structure (sans ressources). */
function fallbackSlug(stepId: string): string {
  return stepId.replace(/^acad-/, '')
}

const LEVELS = PARCOURS_ACADEMIE.niveaux

/** Vue d'un niveau pour la page Académie. */
export interface AcademieLevelView {
  id: string
  ordre: number
  titre: string
  theme: string
  description: string
  couleur: string
  totalModules: number
  certificatId?: string
}

export function getLevels(): AcademieLevelView[] {
  return LEVELS.map((l) => ({
    id: l.id, ordre: l.ordre, titre: l.titre, theme: l.theme,
    description: l.description, couleur: l.couleur ?? '#D4AF37',
    totalModules: l.steps.length, certificatId: l.certificatId,
  }))
}

function buildModuleView(levelId: string, niveauLabel: string, niveauCouleur: string, step: any): AcademieModuleView {
  const res = RESOURCES[step.id] ?? {}
  return {
    slug: res.slug ?? fallbackSlug(step.id),
    stepId: step.id,
    levelId,
    niveauLabel,
    niveauCouleur,
    ordre: step.ordre,
    titre: step.titre,
    sousTitre: step.sousTitre,
    apropos: res.apropos,
    cover: res.cover,
    thumbnail: res.thumbnail,
    pdf: res.pdf,
    videoUrl: res.videoUrl,
    badgeId: step.badgeId ?? res.badgeId,
    badgeLabel: res.badgeLabel,
    hasRealContent: !!res.hasRealContent,
  }
}

/** Tous les modules d'un niveau (vue). */
export function getLevelModules(levelId: string): AcademieModuleView[] {
  const level = LEVELS.find((l) => l.id === levelId)
  if (!level) return []
  const niveauLabel = level.titre
  const couleur = level.couleur ?? '#D4AF37'
  return [...level.steps]
    .sort((a, b) => a.ordre - b.ordre)
    .map((s) => buildModuleView(levelId, niveauLabel, couleur, s))
}

/** Un module par slug (recherche sur tous les niveaux). */
export function getModuleBySlug(slug: string): AcademieModuleView | null {
  for (const level of LEVELS) {
    for (const step of level.steps) {
      const res = RESOURCES[step.id]
      const s = res?.slug ?? fallbackSlug(step.id)
      if (s === slug) return buildModuleView(level.id, level.titre, level.couleur ?? '#D4AF37', step)
    }
  }
  return null
}

/** Le module suivant (même niveau puis niveaux suivants), pour « Continuer ». */
export function getNextModule(stepId: string): AcademieModuleView | null {
  const all = flattenSteps(PARCOURS_ACADEMIE)
  const idx = all.findIndex((s) => s.id === stepId)
  if (idx < 0 || idx + 1 >= all.length) return null
  const next = all[idx + 1]
  const level = LEVELS.find((l) => l.steps.some((s) => s.id === next.id))!
  return buildModuleView(level.id, level.titre, level.couleur ?? '#D4AF37', next)
}

/** Bibliothèque : PDF réellement disponibles (manuels). */
export function getLibrary(): { titre: string; niveau: string; pdf: string; cover?: string }[] {
  const out: { titre: string; niveau: string; pdf: string; cover?: string }[] = []
  for (const level of LEVELS) {
    for (const step of level.steps) {
      const res = RESOURCES[step.id]
      if (res?.pdf) out.push({ titre: step.titre, niveau: level.titre, pdf: res.pdf, cover: res.cover })
    }
  }
  return out
}

export const ACADEMIE_SLUG = PARCOURS_ACADEMIE.slug

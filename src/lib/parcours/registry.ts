/**
 * REGISTRE DES PARCOURS — point d'entrée unique du moteur.
 *
 * Catalogue de tous les programmes de transformation de Citadelle.
 * Ajouter un parcours = ajouter une entrée ici (zéro refonte).
 */
import type { PlatformeId } from '@/types'
import type { Programme, ProgrammeType } from './types'
import { PARCOURS_INTEGRATION } from './integration'
import { PARCOURS_ACADEMIE } from './academie'
import { PARCOURS_MAHANAIM } from './mahanaim'

/** Stub de programme « à venir » (structure CFIC complète, contenu ultérieur). */
function planned(
  slug: string, titre: string, sousTitre: string, type: ProgrammeType,
  plateforme: PlatformeId, icone: string, couleur = '#D4AF37', parent?: 'cfic',
): Programme {
  return {
    slug, titre, sousTitre, description: sousTitre, type, plateforme, parent,
    couleur, icone, niveaux: [], delivreCertificat: true, status: 'planned',
  }
}

/**
 * Catalogue du CFIC (bras académique) : Académie des Élus + Parcours
 * d'Intégration + Écoles & Instituts. (Mahanaïm est autonome, hors CFIC.)
 */
export const CFIC_CATALOGUE: Programme[] = [
  PARCOURS_ACADEMIE,
  PARCOURS_INTEGRATION,
  planned('ecole-serviteurs', 'École des Serviteurs', 'Former à servir avec excellence', 'ecole', 'cfic', '🤲', '#F97316', 'cfic'),
  planned('ecole-leaders', 'École des Leaders', 'Élever et reproduire des leaders', 'ecole', 'cfic', '🦁', '#D4AF37', 'cfic'),
  planned('institut-prophetique', 'Institut Prophétique', 'Discerner et porter la voix prophétique', 'institut', 'cfic', '🔥', '#8B5CF6', 'cfic'),
  planned('institut-gouvernement-royal', 'Institut du Gouvernement Royal', 'Gouverner selon les principes du Royaume', 'institut', 'cfic', '⚖️', '#EC4899', 'cfic'),
]

/** Tous les programmes connus du moteur. */
export const PROGRAMMES: Programme[] = [
  PARCOURS_INTEGRATION,
  PARCOURS_ACADEMIE,
  PARCOURS_MAHANAIM,
  ...CFIC_CATALOGUE.filter((p) => p.slug !== 'academie-des-elus' && p.slug !== 'integration'),
]

const BY_SLUG: Record<string, Programme> = Object.fromEntries(PROGRAMMES.map((p) => [p.slug, p]))

export function getProgramme(slug: string): Programme | null {
  return BY_SLUG[slug] ?? null
}

export function listProgrammes(opts?: { type?: ProgrammeType; plateforme?: PlatformeId; publishedOnly?: boolean }): Programme[] {
  return PROGRAMMES.filter((p) => {
    if (opts?.type && p.type !== opts.type) return false
    if (opts?.plateforme && p.plateforme !== opts.plateforme) return false
    if (opts?.publishedOnly && p.status !== 'published') return false
    return true
  })
}

/** Programmes rattachés à une plateforme donnée. */
export function programmesByPlateforme(plateforme: PlatformeId): Programme[] {
  return PROGRAMMES.filter((p) => p.plateforme === plateforme)
}

export { PARCOURS_INTEGRATION, PARCOURS_ACADEMIE, PARCOURS_MAHANAIM }
export * from './types'
export * from './progress'

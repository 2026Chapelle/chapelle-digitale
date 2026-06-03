/**
 * ACADÉMIE DES ÉLUS — programme principal du CFIC.
 *
 * 6 niveaux × 20 modules = 120 modules. Structure officielle validée.
 * Les niveaux portent les thèmes réels ; les modules sont des emplacements
 * `planned` (contenu rédigé ultérieurement via le CMS / l'admin CFIC) — on
 * n'invente aucun enseignement. L'architecture est ainsi prête sans refonte.
 */
import type { Programme, ParcoursLevel, ParcoursStep } from './types'

const NIVEAUX = [
  { id: 'identite',     titre: 'Niveau 1 · Identité du Royaume',              theme: 'Identité',    couleur: '#D4AF37' },
  { id: 'culture',      titre: 'Niveau 2 · Culture du Royaume',               theme: 'Culture',     couleur: '#22C55E' },
  { id: 'puissance',    titre: 'Niveau 3 · Puissance du Royaume',             theme: 'Puissance',   couleur: '#0EA5E9' },
  { id: 'service',      titre: 'Niveau 4 · Service du Royaume',               theme: 'Service',     couleur: '#F97316' },
  { id: 'prophetique',  titre: 'Niveau 5 · Dimension Prophétique du Royaume', theme: 'Prophétie',   couleur: '#8B5CF6' },
  { id: 'gouvernement', titre: 'Niveau 6 · Gouvernement du Royaume',          theme: 'Gouvernement', couleur: '#EC4899' },
] as const

const MODULES_PAR_NIVEAU = 20

function buildModules(nivId: string, nivOrdre: number): ParcoursStep[] {
  return Array.from({ length: MODULES_PAR_NIVEAU }, (_, i): ParcoursStep => {
    const n = i + 1
    return {
      id: `acad-${nivId}-m${n}`,
      ordre: n,
      titre: `Module ${n}`,
      resume: 'Contenu en cours de préparation par le CFIC.',
      contenu: [],
      // Séquentiel : un module se débloque quand le précédent est validé.
      unlock: { mode: 'sequential' },
      xp: 100,
      status: 'planned',
    }
  })
}

const niveaux: ParcoursLevel[] = NIVEAUX.map((n, idx): ParcoursLevel => ({
  id: `acad-${n.id}`,
  ordre: idx + 1,
  titre: n.titre,
  theme: n.theme,
  description: `Vingt modules pour intégrer la dimension « ${n.theme} » du Royaume.`,
  couleur: n.couleur,
  steps: buildModules(n.id, idx + 1),
  validation: { toutesEtapes: true, scoreMinMoyen: 70 },
  certificatId: `cert-academie-${n.id}`,
}))

export const PARCOURS_ACADEMIE: Programme = {
  slug: 'academie-des-elus',
  titre: 'Académie des Élus',
  sousTitre: 'Le parcours fondamental du CFIC',
  description: 'Six niveaux de transformation — Identité, Culture, Puissance, Service, Dimension Prophétique et Gouvernement du Royaume. 120 modules pour former des élus établis.',
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

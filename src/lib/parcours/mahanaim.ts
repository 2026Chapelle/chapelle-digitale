/**
 * MAHANAÏM — plateforme autonome d'intercession (« le camp des anges »).
 *
 * Progression propre en 5 rangs : Intercesseur → Veilleur → Sentinelle →
 * Capitaine → Stratège, avec certifications, badges et missions.
 * Enseignements possiblement validés par le CFIC, mais Mahanaïm ne dépend
 * pas structurellement du CFIC. Squelette `planned` (contenu via CMS).
 */
import type { Programme, ParcoursLevel, ParcoursStep } from './types'

const RANGS = [
  { id: 'intercesseur', titre: 'Intercesseur', theme: 'Apprendre à se tenir dans la prière',        couleur: '#8B5CF6' },
  { id: 'veilleur',     titre: 'Veilleur',     theme: 'Veiller et discerner les temps',            couleur: '#7C3AED' },
  { id: 'sentinelle',   titre: 'Sentinelle',   theme: 'Garder le mur et protéger',                 couleur: '#6D28D9' },
  { id: 'capitaine',    titre: 'Capitaine',    theme: 'Conduire des équipes de prière',            couleur: '#D4AF37' },
  { id: 'stratege',     titre: 'Stratège',     theme: 'Cartographier et mener le combat spirituel', couleur: '#B8910F' },
] as const

const MODULES_PAR_RANG = 6

function buildModules(rangId: string): ParcoursStep[] {
  return Array.from({ length: MODULES_PAR_RANG }, (_, i): ParcoursStep => {
    const n = i + 1
    return {
      id: `maha-${rangId}-m${n}`,
      ordre: n,
      titre: `Module ${n}`,
      resume: 'Contenu en cours de préparation par Mahanaïm.',
      contenu: [],
      unlock: { mode: 'sequential' },
      xp: 100,
      status: 'planned',
    }
  })
}

const niveaux: ParcoursLevel[] = RANGS.map((r, idx): ParcoursLevel => ({
  id: `maha-${r.id}`,
  ordre: idx + 1,
  titre: r.titre,
  theme: r.theme,
  description: r.theme,
  couleur: r.couleur,
  steps: buildModules(r.id),
  validation: { toutesEtapes: true, scoreMinMoyen: 70 },
  certificatId: `cert-mahanaim-${r.id}`,
}))

export const PARCOURS_MAHANAIM: Programme = {
  slug: 'mahanaim',
  titre: 'Mahanaïm — École d’Intercession',
  sousTitre: 'Le camp des anges',
  description: 'La progression des intercesseurs du Royaume : Intercesseur, Veilleur, Sentinelle, Capitaine, Stratège. Certifications, badges et missions de prière.',
  type: 'mahanaim',
  plateforme: 'mahanaim',
  couleur: '#8B5CF6',
  icone: '🙏',
  delivreCertificat: true,
  badgeFinal: 'mahanaim_stratege',
  status: 'planned',
  rangs: RANGS.map((r) => r.titre),
  niveaux,
}

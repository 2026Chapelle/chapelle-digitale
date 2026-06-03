/**
 * Verrouillage de l'Académie des Élus, CONNECTÉ au parcours de croissance
 * existant (Visiteur → Contact → Intégration → Disciple → Membre → Serviteur →
 * Leader). L'Académie ne crée PAS de second système : elle s'appuie sur le
 * statut du membre.
 *
 * Règle : l'Académie est verrouillée tant que le parcours d'INTÉGRATION n'est
 * pas terminé. « Intégration terminée » = le membre a dépassé l'étape
 * d'Intégration (donc Disciple ou au-delà), ou son étape de discipulat ≥ Membre.
 */
import { TUNNEL_BY_KEY, type TunnelStageKey } from '@/lib/tunnel'

type ProfileLike = { membre_statut?: string; role?: string; parcours_disciple_etape?: number } | null | undefined

/** Statut membre → étape du tunnel (même mapping que /member/dashboard/parcours). */
export function statutToStage(membre_statut?: string): TunnelStageKey {
  switch (membre_statut) {
    case 'visiteur': return 'visiteur'
    case 'nouveau_membre': return 'integration'
    case 'membre_actif': return 'membre'
    case 'disciple': return 'disciple'
    case 'leader_cellule': return 'serviteur'
    case 'berger':
    case 'pasteur': return 'leader'
    default: return 'visiteur'
  }
}

/** Le parcours d'intégration est-il terminé ? (débloque le Niveau 1) */
export function isIntegrationDone(profile: ProfileLike): boolean {
  if (!profile) return false
  const stage = statutToStage(profile.membre_statut || profile.role)
  const idx = TUNNEL_BY_KEY[stage]?.index ?? 0
  const etape = Number(profile.parcours_disciple_etape ?? 0)
  return idx >= TUNNEL_BY_KEY['disciple'].index || etape >= 2
}

/**
 * Un niveau est-il débloqué ?
 *  - Niveau 1 : intégration terminée.
 *  - Niveau N (>1) : intégration terminée ET niveau N-1 validé.
 */
export function isLevelUnlocked(levelIndex: number, integrationDone: boolean, prevLevelValidated: boolean): boolean {
  if (!integrationDone) return false
  if (levelIndex === 0) return true
  return prevLevelValidated
}

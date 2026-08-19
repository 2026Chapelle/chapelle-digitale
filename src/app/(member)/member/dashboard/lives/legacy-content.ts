/**
 * CONTENU MEMBRE LEGACY — Live/Vidéo (Phase 1D).
 *
 * ⚠️ CE N'EST PAS de la donnée canonique `cms_lives`. Ce sont des constantes
 * HÉRITÉES que `cms_lives` ne sait pas encore modéliser :
 *   - récurrence hebdomadaire (programmes réguliers) ;
 *   - playlists YouTube officielles (pas de `playlist_id` dans le schéma).
 *
 * Conservées TEMPORAIREMENT (GO_KEEP_LEGACY_PLAYLISTS_TEMPORARILY=YES) et
 * affichées comme telles, VISUELLEMENT SÉPARÉES du flux `cms_lives`. Aucune de
 * ces valeurs ne doit être présentée comme un enregistrement Live canonique.
 *
 * Dette documentée : la migration éventuelle (table programmes / entité émission /
 * playlist liée / règle de récurrence) relève d'une décision structurante Phase 1E.
 * Voir CITADELLE_LIVE_VIDEO_PHASE_1D_MEMBER_LIVE_REPORT.
 */

/** Playlist YouTube officielle CIER — lecture intégrée (le membre reste dans Citadelle). */
export interface LegacyPlaylist {
  titre: string
  emoji: string
  couleur: string
  /** ID de playlist YouTube (paramètre `list=`). */
  listId: string
}

export const LEGACY_PLAYLISTS_PROGRAMMES: LegacyPlaylist[] = [
  { titre: 'Culte de célébration royale', emoji: '⛪', couleur: '#D4AF37', listId: 'PLxNRRXEmUleFrBmQBbULlXkMRLCRUUOCZ' },
  { titre: 'Matinale de prière',          emoji: '🌅', couleur: '#8B5CF6', listId: 'PLxNRRXEmUleEnodeexpNieSFoA6buYIz2' },
  { titre: 'École du Royaume',            emoji: '📖', couleur: '#0EA5E9', listId: 'PLxNRRXEmUleFyJdheYr95byo50Jdvf9SS' },
  { titre: 'Vendredi de Puissance',       emoji: '🔥', couleur: '#EF4444', listId: 'PLxNRRXEmUleE2-_qS8PujnNJYUu2GuFUb' },
]

/** Programme récurrent officiel (heure d'Abidjan / GMT). Rappel indicatif, non lié à cms_lives. */
export interface LegacyProgramme {
  titre: string
  jour: string
  heure: string
}

export const LEGACY_PROGRAMMES_REGULIERS: LegacyProgramme[] = [
  { titre: 'Culte de célébration royale', jour: 'Dimanche', heure: '10h30' },
  { titre: 'Matinale de prière', jour: 'Mercredi', heure: '05h30' },
  { titre: 'Oracle du Mardi', jour: 'Mardi', heure: '20h30' },
  { titre: 'Vendredi de Puissance', jour: 'Vendredi', heure: '21h00' },
  { titre: 'Batailles de la Nuit', jour: 'Selon programmation', heure: '21h30' },
  { titre: 'Cohorte de prière', jour: 'Jeudi', heure: 'Selon programmation' },
]

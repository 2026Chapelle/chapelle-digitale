/**
 * CONTENU MEMBRE LEGACY RÉSIDUEL — Live/Vidéo (réduit en Phase 1F-C1).
 *
 * Les 4 programmes canoniques (Matinale, École du Royaume, Vendredi de puissance,
 * Culte de Célébration Royale) ET leurs playlists YouTube sont désormais servis par
 * la table `live_programs` (source de vérité unique des horaires réguliers). Ils ont
 * donc été RETIRÉS d'ici.
 *
 * Ne restent que les repères hebdomadaires SANS programme canonique ni playlist
 * (non arbitrés), conservés temporairement pour ne perdre aucune information membre.
 * À terme, s'ils deviennent des programmes officiels, les créer dans `live_programs`.
 *
 * ⚠️ NE PLUS ajouter ici de programme disposant d'un `live_programs` — pas de double
 * source de vérité.
 */

/** Repère hebdomadaire résiduel (jour + heure indicatifs), hors modèle canonique. */
export interface LegacyProgramme {
  titre: string
  jour: string
  heure: string
}

export const LEGACY_EXTRA_PROGRAMMES: LegacyProgramme[] = [
  { titre: 'Oracle du Mardi', jour: 'Mardi', heure: '20h30' },
  { titre: 'Batailles de la Nuit', jour: 'Selon programmation', heure: '21h30' },
  { titre: 'Cohorte de prière', jour: 'Jeudi', heure: 'Selon programmation' },
]

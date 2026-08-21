/**
 * CITADELLE LIVING BOOKS — LB-1B : moteur PUR du tourne-page « corner-drag ».
 *
 * Aucune dépendance (ni React, ni pdfjs, ni DOM) : 100 % testable. Le composant
 * consomme ces fonctions ; toute la MATH du geste vit ICI (zone de préhension,
 * progression du pli, angle, ombre dynamique, décision relâcher = tourner / revenir).
 *
 * Convention : progress ∈ [0,1] (0 = page à plat, 1 = page tournée). L'angle
 * rotateY est négatif pour la page DROITE qui se replie vers la gauche (avance),
 * positif pour la page GAUCHE qui se replie vers la droite (recul).
 */

export type FlipEdge = 'left' | 'right'

/** Largeur relative des zones de préhension à gauche/droite (fraction de la largeur). */
export const FLIP_EDGE_ZONE = 0.2
/** Progression minimale au relâcher pour VALIDER le tourne-page (sinon retour). */
export const FLIP_COMPLETE_THRESHOLD = 0.4

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/**
 * Quel bord est saisi selon la position X du pointeur dans le rectangle de lecture ?
 * `right` = zone droite (tourner vers l'avant), `left` = zone gauche (revenir),
 * null = zone centrale (pas de tourne-page → sélection texte / pan préservés).
 */
export function grabEdge(pointerX: number, rectWidth: number, zone: number = FLIP_EDGE_ZONE): FlipEdge | null {
  if (!Number.isFinite(pointerX) || rectWidth <= 0) return null
  const r = pointerX / rectWidth
  if (r >= 1 - zone) return 'right'
  if (r <= zone) return 'left'
  return null
}

/**
 * Progression du pli d'après le déplacement horizontal du pointeur.
 * Bord droit : tirer vers la GAUCHE (dx négatif) fait progresser.
 * Bord gauche : tirer vers la DROITE (dx positif) fait progresser.
 */
export function flipProgress(dx: number, width: number, edge: FlipEdge): number {
  if (width <= 0) return 0
  const raw = edge === 'right' ? -dx / width : dx / width
  return clamp01(raw)
}

/** Angle rotateY (deg) du feuillet en cours de tournage, selon progression et bord. */
export function flipAngle(progress: number, edge: FlipEdge): number {
  const p = clamp01(progress)
  return edge === 'right' ? -180 * p : 180 * p
}

/**
 * Opacité de l'ombre dynamique du pli : nulle à plat et à plat-tourné, maximale
 * à mi-parcours (sensation de courbure/relief). Bornée [0, maxOpacity].
 */
export function foldShadow(progress: number, maxOpacity = 0.45): number {
  const p = clamp01(progress)
  return Math.sin(p * Math.PI) * maxOpacity
}

/** Décision au relâcher : tourner la page (complete) ou revenir (snap_back). */
export function resolveRelease(
  progress: number,
  threshold: number = FLIP_COMPLETE_THRESHOLD,
): 'complete' | 'snap_back' {
  return clamp01(progress) >= threshold ? 'complete' : 'snap_back'
}

/**
 * Le tourne-page « physique » est-il autorisé dans l'état courant ? Non si zoom
 * actif (> 1 → priorité au PAN), non en mode réduit-mouvement, non hors mode livre.
 * Le composant retombe alors sur la navigation simple (boutons/clavier/swipe).
 */
export function canPhysicalTurn(opts: {
  mode: 'livre' | 'lecture'
  scale: number
  reduceMotion: boolean
}): boolean {
  return opts.mode === 'livre' && opts.scale <= 1 && !opts.reduceMotion
}

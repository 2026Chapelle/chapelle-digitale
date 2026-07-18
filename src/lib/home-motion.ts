/**
 * Motion unique — homepage Citadelle
 * Fade + translate perceptibles, calmes, max ~1s.
 * Titres avant contenu. Une seule courbe.
 */
export const HOME_EASE = [0.16, 1, 0.3, 1] as const
/** Durée standard sections (0.8–1s) */
export const HOME_DUR = 0.95
/** Translation Y des reveals (perceptible) */
export const HOME_Y = 24

/** Apparition titre (prioritaire) */
export function titleReveal(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: HOME_Y } as const),
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: HOME_DUR,
      delay: reduce ? 0 : delay,
      ease: HOME_EASE,
    },
  }
}

/** Apparition corps / contenu (après le titre) */
export function bodyReveal(reduce: boolean | null, delay = 0.14) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: HOME_Y - 4 } as const),
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: HOME_DUR,
      delay: reduce ? 0 : delay,
      ease: HOME_EASE,
    },
  }
}

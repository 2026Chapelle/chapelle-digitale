/**
 * Motion unique — homepage Citadelle
 * Fade + translate perceptibles (0.9s), titre avant contenu.
 */
export const HOME_EASE = [0.16, 1, 0.3, 1] as const
export const HOME_DUR = 0.9
/** Translation Y des reveals — perceptible sans théâtre */
export const HOME_Y = 32

export const HOME_VIEWPORT = { once: true as const, amount: 0.2, margin: '-40px 0px' as const }

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
    initial: reduce ? false : ({ opacity: 0, y: HOME_Y - 6 } as const),
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: HOME_DUR,
      delay: reduce ? 0 : delay,
      ease: HOME_EASE,
    },
  }
}

/** Apparition carte / item (scale discret) */
export function cardReveal(reduce: boolean | null, delay = 0.16) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: 24, scale: 0.985 } as const),
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: {
      duration: 0.9,
      delay: reduce ? 0 : delay,
      ease: HOME_EASE,
    },
  }
}

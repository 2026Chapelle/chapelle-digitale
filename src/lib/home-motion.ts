/**
 * Motion unique — homepage Citadelle
 * Une courbe, une durée, titres avant contenu.
 */
export const HOME_EASE = [0.16, 1, 0.3, 1] as const
export const HOME_DUR = 0.85

/** Apparition titre (prioritaire) */
export function titleReveal(reduce: boolean | null, delay = 0) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: 18 } as const),
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: HOME_DUR,
      delay: reduce ? 0 : delay,
      ease: HOME_EASE,
    },
  }
}

/** Apparition corps / contenu (après le titre) */
export function bodyReveal(reduce: boolean | null, delay = 0.12) {
  return {
    initial: reduce ? false : ({ opacity: 0, y: 14 } as const),
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: HOME_DUR,
      delay: reduce ? 0 : delay,
      ease: HOME_EASE,
    },
  }
}

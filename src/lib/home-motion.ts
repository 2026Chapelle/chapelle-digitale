/**
 * Motion unique — homepage Citadelle
 * Reveal perceptible (opacity + Y + léger blur), titre avant contenu.
 * never stuck : whileInView + initial=false en reduced-motion.
 */
export const HOME_EASE = [0.16, 1, 0.3, 1] as const
/** Durée du reveal — ~1s, élégante sans théâtre */
export const HOME_DUR = 0.98
/** Translation Y des reveals — 36–48 px */
export const HOME_Y = 42
/** Blur initial discret (px) */
export const HOME_BLUR = 6

export const HOME_VIEWPORT = {
  once: true as const,
  amount: 0.18,
  margin: '0px 0px -6% 0px' as const,
}

/** Stagger label → titre → sous-titre → corps → cartes → CTA */
export const HOME_DELAY = {
  label: 0,
  title: 0.05,
  subtitle: 0.11,
  body: 0.17,
  card: 0.22,
  cardStep: 0.075,
  cta: 0.3,
} as const

type RevealOpts = {
  delay?: number
  y?: number
  /** default true — désactiver pour éléments très larges / perf */
  blur?: boolean
  scale?: boolean
}

/** Transition standard */
export function revealTransition(reduce: boolean | null, delay = 0) {
  return {
    duration: reduce ? 0.01 : HOME_DUR,
    delay: reduce ? 0 : delay,
    ease: HOME_EASE,
  }
}

/**
 * État initial — `false` si reduced-motion (contenu immédiatement visible).
 * Sinon opacity 0 + translateY + blur optionnel.
 */
export function revealInitial(reduce: boolean | null, opts: RevealOpts = {}) {
  if (reduce) return false as const
  const y = opts.y ?? HOME_Y
  const withBlur = opts.blur !== false
  return {
    opacity: 0,
    y,
    ...(withBlur ? { filter: `blur(${HOME_BLUR}px)` } : {}),
    ...(opts.scale ? { scale: 0.985 } : {}),
  }
}

/** État visible (cible whileInView) */
export function revealVisible(opts: RevealOpts = {}) {
  return {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    ...(opts.scale ? { scale: 1 } : {}),
  }
}

/** Helpers legacy (pages hors homepage) — conservés */
export function titleReveal(reduce: boolean | null, delay = 0) {
  return {
    initial: revealInitial(reduce),
    animate: revealVisible(),
    transition: revealTransition(reduce, delay),
  }
}

export function bodyReveal(reduce: boolean | null, delay = 0.14) {
  return {
    initial: revealInitial(reduce, { y: HOME_Y - 6 }),
    animate: revealVisible(),
    transition: revealTransition(reduce, delay),
  }
}

export function cardReveal(reduce: boolean | null, delay = 0.16) {
  return {
    initial: revealInitial(reduce, { y: 28, scale: true }),
    animate: revealVisible({ scale: true }),
    transition: revealTransition(reduce, delay),
  }
}

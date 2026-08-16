/**
 * Transition entre scènes — halo cosmique (or + bleu nuit), pas de séparateur UI.
 */
export function SectionGlow() {
  return (
    <div aria-hidden className="relative w-full h-10 md:h-14 pointer-events-none select-none overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,90vw)] h-16 md:h-20"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(212,175,55,0.05) 0%, rgba(30,64,175,0.04) 38%, transparent 70%)',
        }}
      />
    </div>
  )
}

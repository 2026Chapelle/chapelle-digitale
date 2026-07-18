/**
 * Transition entre scènes — halo cosmique (or + bleu nuit), pas de séparateur UI.
 */
export function SectionGlow() {
  return (
    <div aria-hidden className="relative w-full h-20 md:h-28 pointer-events-none select-none overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(900px,95vw)] h-24 md:h-32"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(212,175,55,0.06) 0%, rgba(30,64,175,0.05) 38%, transparent 70%)',
        }}
      />
    </div>
  )
}

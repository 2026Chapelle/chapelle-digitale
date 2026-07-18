/**
 * Respiration entre scènes — lumière, pas de ligne decorative forte.
 */
export function SectionGlow() {
  return (
    <div aria-hidden className="relative w-full h-16 md:h-24 pointer-events-none select-none">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,90vw)] h-20 md:h-28"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(212,175,55,0.07) 0%, rgba(30,58,138,0.04) 40%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-x-[12%] top-1/2 h-px -translate-y-1/2 opacity-40"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(212,175,55,0.18), rgba(244,241,233,0.08), transparent)',
        }}
      />
    </div>
  )
}

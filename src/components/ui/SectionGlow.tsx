/**
 * Séparateur lumineux premium entre deux sections (CSS pur, zéro JS).
 * Ligne dorée en dégradé + halo doux centré. Léger, n'alourdit pas la page.
 */
export function SectionGlow() {
  return (
    <div aria-hidden className="relative w-full h-px my-1 md:my-3 pointer-events-none">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.30), rgba(212,175,55,0.10), transparent)' }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2 -top-12 w-[460px] max-w-[80vw] h-24"
        style={{ background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.09), transparent 70%)', filter: 'blur(4px)' }}
      />
    </div>
  )
}

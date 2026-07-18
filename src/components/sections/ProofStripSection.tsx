/**
 * SCÈNE 2 — PREUVE (blueprint V3)
 *
 * Bandeau horizontal.
 * Uniquement des surfaces produit réelles (liens vers pages existantes).
 * Aucun chiffre, aucune statistique inventée.
 */
import Link from 'next/link'

/** Surfaces réelles de la plateforme — labels uniquement, pas de compteurs. */
const PROOF_ITEMS = [
  { label: 'Parcours', href: '/parcours' },
  { label: 'Enseignements', href: '/enseignements' },
  { label: 'Événements', href: '/evenements' },
  { label: 'Cellules', href: '/groupes' },
  { label: 'Pays', href: '/contact' },
] as const

export function ProofStripSection() {
  return (
    <section
      className="relative border-y"
      style={{
        borderColor: 'rgba(212,175,55,0.10)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.35), rgba(6,6,10,0.2))',
      }}
      aria-label="Preuve — surfaces Citadelle"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-6">
        <ul
          className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 md:gap-x-12 gap-y-3 list-none m-0 p-0"
          role="list"
        >
          {PROOF_ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="font-inter text-[11px] md:text-xs tracking-[0.22em] sm:tracking-[0.28em] uppercase transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] rounded-sm"
                style={{ color: 'rgba(235,217,160,0.55)' }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

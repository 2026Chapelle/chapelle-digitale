/**
 * SCÈNE 2 — PREUVE
 * Bandeau horizontal de surfaces produit RÉELLES uniquement.
 * Aucun chiffre inventé, aucune statistique fictive.
 */
import Link from 'next/link'

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
      aria-label="Ce que Citadelle offre"
    >
      <div className="container-cinematic py-5 md:py-6">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:gap-x-12 list-none m-0 p-0">
          {PROOF_ITEMS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="font-inter text-[11px] md:text-xs tracking-[0.28em] uppercase transition-colors hover:text-gold"
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

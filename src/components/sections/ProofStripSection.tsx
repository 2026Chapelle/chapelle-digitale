/**
 * SCÈNE 2 — PREUVE · capsule Liquid Glass flottante
 * Surfaces produit réelles uniquement — aucun chiffre inventé.
 */
import type { CSSProperties } from 'react'
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
      className="relative z-10 -mt-2 md:-mt-4 pb-2 md:pb-4"
      aria-label="Preuve — surfaces Citadelle"
    >
      {/* Espace après le Hero / CTA */}
      <div className="pt-6 md:pt-10 lg:pt-12" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex justify-center">
        <div
          className="lg lg--refract lg--pill citadelle-proof-capsule w-full max-w-3xl"
          style={
            {
              '--lg-radius': '999px',
              '--lg-tint': '0.07',
              '--lg-blur': '14px',
              '--lg-stroke': '0.14',
            } as CSSProperties
          }
        >
          <ul
            className="relative z-10 flex flex-wrap items-center justify-center gap-x-5 sm:gap-x-7 md:gap-x-9 gap-y-2.5 list-none m-0 px-5 sm:px-8 py-3.5 sm:py-4"
            role="list"
          >
            {PROOF_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="citadelle-proof-link font-inter text-[10px] sm:text-[11px] md:text-xs tracking-[0.18em] sm:tracking-[0.24em] uppercase transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] rounded-sm"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

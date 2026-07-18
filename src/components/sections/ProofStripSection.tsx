/**
 * SCÈNE 2 — PREUVE
 * Desktop : capsule liquid glass.
 * Mobile : carrousel horizontal de mini-capsules (pas de scroll document).
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
      className="relative z-10 citadelle-proof-section"
      aria-label="Preuve — surfaces Citadelle"
    >
      {/* Desktop : capsule unique */}
      <div className="hidden md:block pt-8 lg:pt-10 pb-2">
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
              className="relative z-10 flex flex-wrap items-center justify-center gap-x-7 md:gap-x-9 gap-y-2.5 list-none m-0 px-8 py-3.5"
              role="list"
            >
              {PROOF_ITEMS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="citadelle-proof-link font-inter text-[11px] md:text-xs tracking-[0.24em] uppercase transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] rounded-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Mobile : carrousel compact */}
      <div className="md:hidden pt-4 pb-1">
        <div className="citadelle-proof-scroll-wrap relative">
          <ul
            className="citadelle-proof-scroll flex gap-2.5 list-none m-0 px-4 py-1 overflow-x-auto snap-x snap-mandatory"
            role="list"
          >
            {PROOF_ITEMS.map((item) => (
              <li key={item.label} className="snap-start flex-shrink-0">
                <Link
                  href={item.href}
                  className="lg lg--refract lg--pill citadelle-proof-chip inline-flex items-center px-4 py-2.5 font-inter text-[10px] tracking-[0.2em] uppercase whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
                  style={
                    {
                      '--lg-radius': '999px',
                      '--lg-tint': '0.08',
                      '--lg-blur': '12px',
                      '--lg-stroke': '0.12',
                      color: 'rgba(235,217,160,0.65)',
                      minHeight: '44px',
                    } as CSSProperties
                  }
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

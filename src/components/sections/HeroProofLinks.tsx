/**
 * Sous-menu mobile vertical — boutons Liquid Glass centrés, largeur contenu.
 */
import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  Route,
  BookOpen,
  CalendarDays,
  Users,
  Globe2,
  type LucideIcon,
} from 'lucide-react'

const ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Parcours', href: '/parcours', icon: Route },
  { label: 'Enseignements', href: '/enseignements', icon: BookOpen },
  { label: 'Événements', href: '/evenements', icon: CalendarDays },
  { label: 'Cellules', href: '/groupes', icon: Users },
  { label: 'Pays', href: '/contact', icon: Globe2 },
]

export function HeroProofLinks() {
  return (
    <nav
      className="md:hidden w-full flex flex-col items-center gap-2 mt-5 px-2"
      aria-label="Accès rapides Citadelle"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="citadelle-proof-mobile-btn lg lg--refract font-inter text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            style={
              {
                '--lg-radius': '18px',
                '--lg-tint': '0.08',
                '--lg-blur': '12px',
                '--lg-stroke': '0.13',
                color: 'rgba(235,231,221,0.82)',
              } as CSSProperties
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.8)' }} aria-hidden />
            <span className="tracking-wide">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

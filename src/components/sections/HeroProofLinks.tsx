/**
 * Sous-menu mobile vertical — pile compacte sous « Découvrir Citadelle ».
 * Desktop : non affiché (bandeau preuve séparé).
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
      className="md:hidden w-full max-w-sm mx-auto mt-5 space-y-2"
      aria-label="Accès rapides Citadelle"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="lg lg--refract flex items-center gap-3 w-full min-h-[48px] px-4 rounded-2xl font-inter text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
            style={
              {
                '--lg-radius': '16px',
                '--lg-tint': '0.07',
                '--lg-blur': '12px',
                '--lg-stroke': '0.12',
                color: 'rgba(235,231,221,0.78)',
              } as CSSProperties
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.75)' }} aria-hidden />
            <span className="tracking-wide">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

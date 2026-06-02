import type { Metadata } from 'next'
import { HomeSections } from '@/components/sections/HomeSections'

// ISR : l'accueil est régénéré au plus toutes les heures (perf LCP, moins d'appels CMS).
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'La Chapelle Internationale des Élus du Royaume — Une Église Ouverte au Monde',
  description: 'Rejoignez des milliers de croyants dans la plus grande église digitale francophone. Cultes en direct, formations bibliques, communauté mondiale, prière 24/7.',
}

// L'ordre, la visibilité et le contenu des sections sont pilotés par le CMS
// (table cms_homepage_blocks, éditable dans /admin/homepage-blocks).
export default function HomePage() {
  return <HomeSections />
}

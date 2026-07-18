import type { Metadata } from 'next'
import { HomeSections } from '@/components/sections/HomeSections'

// ISR : l'accueil est régénéré au plus toutes les heures (perf LCP, moins d'appels CMS).
export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Citadelle — L’église digitale qui t’accompagne',
  description:
    'Grandis dans ta foi avec Citadelle : enseignements, parcours, prière, événements et communauté — une plateforme de croissance spirituelle accessible partout.',
}

// L'ordre, la visibilité et le contenu des sections sont pilotés par le CMS
// (table cms_homepage_blocks, éditable dans /admin/homepage-blocks).
export default function HomePage() {
  return <HomeSections />
}

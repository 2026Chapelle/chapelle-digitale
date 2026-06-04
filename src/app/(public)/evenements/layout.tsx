import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Événements & Conférences',
  description:
    "Cultes principaux, veillées d'intercession, conférences leadership, formations CFIC. Calendrier complet des événements en ligne et en présentiel.",
  keywords: ['événement chrétien', 'culte dimanche', 'conférence chrétienne', 'veillée prière', 'CIER agenda'],
  openGraph: {
    title: 'Événements CIER',
    description: 'Cultes, veillées, conférences et formations — en direct ou en présentiel, partout dans le monde.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Agenda CIER', title: 'Événements & Conférences', subtitle: 'Cultes, veillées, conférences et formations — en direct ou en présentiel.' })],
  },
  alternates: { canonical: '/evenements' },
}

export default function EvenementsLayout({ children }: { children: React.ReactNode }) {
  // Le JSON-LD d'événements est volontairement omis tant qu'il n'est pas généré à
  // partir des événements réels (cms_events). Aucune donnée d'événement fictive
  // n'est exposée aux moteurs de recherche.
  return <>{children}</>
}

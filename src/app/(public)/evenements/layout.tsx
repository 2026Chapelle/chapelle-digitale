import type { Metadata } from 'next'
import { EVENEMENTS } from '@/lib/mock/evenements'
import { ogImage } from '@/lib/og'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cier.org'

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
  // Generate Event JSON-LD for upcoming events only (omit past).
  const upcoming = EVENEMENTS.filter((e) => !e.est_passe).slice(0, 12)
  const eventListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Événements à venir — CIER',
    itemListElement: upcoming.map((e, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Event',
        name: e.titre,
        description: e.description,
        startDate: `${e.date}T${e.heure}:00+02:00`,
        endDate: e.heure_fin ? `${e.date}T${e.heure_fin}:00+02:00` : undefined,
        eventAttendanceMode: e.en_ligne
          ? 'https://schema.org/OnlineEventAttendanceMode'
          : 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        location: e.en_ligne
          ? { '@type': 'VirtualLocation', url: `${APP_URL}${e.lien_live ?? '/live'}` }
          : { '@type': 'Place', name: e.lieu, address: e.lieu },
        organizer: {
          '@type': 'Organization',
          name: 'La Chapelle Internationale des Élus du Royaume',
          url: APP_URL,
        },
        inLanguage: 'fr-FR',
        isAccessibleForFree: true,
      },
    })),
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventListLd) }}
      />
      {children}
    </>
  )
}

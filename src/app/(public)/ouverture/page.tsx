import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'
import { siteUrl } from '@/lib/site-url'
import { OPENING_ISO, countdownTo, isOpen, resolveOpeningVideo } from '@/lib/ouverture'
import OuvertureContent from './OuvertureContent'

/**
 * Landing page d'ouverture publique de La Citadelle — 02 août 2026, 00H00 (Abidjan).
 *
 * Rendu régénéré au plus toutes les 5 minutes : le HTML servi n'est jamais figé
 * au moment du build, ce qui garde le compte à rebours et la bascule des CTA
 * cohérents avant même l'hydratation. Le client recalcule ensuite à la seconde.
 */
export const revalidate = 300

const OG = {
  title: 'Ouverture de La Citadelle — 02 août 2026 à 00H00',
  description:
    'La Citadelle ouvre ses portes le dimanche 02 août 2026 à 00H00. Découvre une maison digitale pour apprendre, grandir et avancer dans ta destinée avec Dieu.',
}

export const metadata: Metadata = {
  // `absolute` court-circuite le gabarit « %s | CIER » du layout racine : le
  // titre de campagne doit être exactement celui validé pour le partage social.
  title: { absolute: OG.title },
  description: OG.description,
  keywords: [
    'ouverture La Citadelle',
    'église digitale',
    'plateforme croissance spirituelle',
    '02 août 2026',
    'maison digitale chrétienne',
    'parcours spirituel en ligne',
  ],
  alternates: { canonical: '/ouverture' },
  openGraph: {
    type: 'website',
    url: '/ouverture',
    title: OG.title,
    description: OG.description,
    images: [
      {
        // Image sociale générée par /api/og (1200×630, palette de la marque).
        // À remplacer par un visuel dédié dès qu'il est fourni.
        url: ogImage({
          eyebrow: 'Ouverture publique',
          title: 'La Citadelle ouvre ses portes',
          subtitle: 'Dimanche 02 août 2026 — 00H00 (heure d’Abidjan)',
        }),
        width: 1200,
        height: 630,
        alt: 'La Citadelle ouvre ses portes — dimanche 02 août 2026 à 00H00',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG.title,
    description: OG.description,
    images: [
      ogImage({
        eyebrow: 'Ouverture publique',
        title: 'La Citadelle ouvre ses portes',
        subtitle: 'Dimanche 02 août 2026 — 00H00 (heure d’Abidjan)',
      }),
    ],
  },
}

export default function OuverturePage() {
  const now = Date.now()
  const open = isOpen(now)
  const countdown = countdownTo(now)
  const video = resolveOpeningVideo(process.env.NEXT_PUBLIC_OUVERTURE_VIDEO_URL)

  /* Schema.org Event — décrit un fait réel et vérifiable : l'ouverture publique
     en ligne, à une date et une heure précises. Aucune donnée inventée
     (ni prix, ni jauge, ni lieu physique). */
  const eventLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Ouverture publique de La Citadelle',
    description: OG.description,
    startDate: OPENING_ISO,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    url: siteUrl('/ouverture'),
    location: {
      '@type': 'VirtualLocation',
      url: siteUrl('/ouverture'),
    },
    organizer: {
      '@type': 'Organization',
      name: 'La Chapelle Internationale des Élus du Royaume',
      url: siteUrl('/'),
    },
    inLanguage: 'fr-FR',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }}
      />
      <OuvertureContent initialOpen={open} initialCountdown={countdown} video={video} />
    </>
  )
}

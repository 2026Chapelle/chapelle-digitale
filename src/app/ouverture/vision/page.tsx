import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'
import { siteUrl } from '@/lib/site-url'
import {
  OPENING_ISO,
  OPENING_SEO,
  OUVERTURE_ROUTES,
  countdownTo,
  isOpen,
  resolveOpeningVideo,
} from '@/lib/ouverture'
import VisionContent from './VisionContent'

/**
 * Landing détaillée de l'ouverture publique de La Citadelle.
 *
 * Atteinte depuis la page d'entrée festive `/ouverture`. Elle porte le récit
 * complet : vision, quatre promesses, trois étapes, premiers membres, verset
 * et appel final. Aucune date n'est écrite en dur — tout dérive de
 * `OPENING_ISO` et des libellés de `@/lib/ouverture`.
 *
 * Rendu régénéré au plus toutes les 5 minutes : le HTML servi n'est jamais figé
 * au moment du build, ce qui garde le compte à rebours et la bascule des CTA
 * cohérents avant même l'hydratation. Le client recalcule ensuite à la seconde.
 */
export const revalidate = 300

const TITLE = `La vision de La Citadelle — ouverture du ${OPENING_SEO.keyword}`

const OG_IMAGE = ogImage({
  eyebrow: 'La vision',
  title: OPENING_SEO.ogTitle,
  subtitle: OPENING_SEO.ogSubtitle,
})

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: OPENING_SEO.description,
  keywords: [
    'vision La Citadelle',
    'église digitale',
    'plateforme croissance spirituelle',
    OPENING_SEO.keyword,
    'maison digitale chrétienne',
    'parcours spirituel en ligne',
  ],
  alternates: { canonical: OUVERTURE_ROUTES.vision },
  openGraph: {
    type: 'website',
    url: OUVERTURE_ROUTES.vision,
    title: TITLE,
    description: OPENING_SEO.description,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: OPENING_SEO.ogAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: OPENING_SEO.description,
    images: [OG_IMAGE],
  },
}

export default function OuvertureVisionPage() {
  const now = Date.now()
  const open = isOpen(now)
  const countdown = countdownTo(now)
  /* Vidéo propre à la page « vision » : variable dédiée, distincte de la vidéo
     teaser de /ouverture. Même résolveur (youtu.be / watch / embed / fichier),
     aucune logique de parsing dupliquée. Non configurée → emplacement en attente,
     jamais la mauvaise vidéo. */
  const video = resolveOpeningVideo(process.env.NEXT_PUBLIC_OUVERTURE_VISION_VIDEO_URL)

  /* Schema.org Event — décrit un fait réel et vérifiable : l'ouverture publique
     en ligne, à une date et une heure précises. Aucune donnée inventée
     (ni prix, ni jauge, ni lieu physique). L'URL canonique de l'événement reste
     la page d'entrée `/ouverture`. */
  const eventLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Ouverture publique de La Citadelle',
    description: OPENING_SEO.description,
    startDate: OPENING_ISO,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    url: siteUrl(OUVERTURE_ROUTES.entree),
    location: {
      '@type': 'VirtualLocation',
      url: siteUrl(OUVERTURE_ROUTES.entree),
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
      <VisionContent initialOpen={open} initialCountdown={countdown} video={video} />
    </>
  )
}

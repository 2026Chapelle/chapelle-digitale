import type { Metadata, Viewport } from 'next'
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
import EntreeContent from './EntreeContent'

/**
 * Page d'entrée festive de l'ouverture publique de La Citadelle.
 *
 * Premier écran : titre, date, vidéo de campagne et CTA. Le récit détaillé
 * (vision, promesses, étapes, verset) vit sur /ouverture/vision.
 * Aucune date n'est écrite en dur — tout dérive de `OPENING_ISO` et des
 * libellés de `@/lib/ouverture`.
 *
 * Rendu régénéré au plus toutes les 5 minutes : le HTML servi n'est jamais figé
 * au moment du build, ce qui garde le compte à rebours et la bascule des CTA
 * cohérents avant même l'hydratation. Le client recalcule ensuite à la seconde.
 */
export const revalidate = 300

/**
 * `viewportFit: 'cover'` est indispensable pour que `env(safe-area-inset-*)`
 * renvoie autre chose que 0 : sans lui, les encoches et la barre gestuelle
 * iOS rogneraient le contenu de cette page plein écran. Déclaré ici seulement,
 * donc sans effet sur le reste du site.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#050816',
}

/**
 * Styles de page, volontairement non « layerisés ».
 *
 * 1. `globals.css` impose `body { min-height: 100vh }` dans `@layer base`.
 *    Sur mobile, `100vh` inclut la barre d'URL rétractable et dépasse donc
 *    `100svh` : le corps serait plus haut que le viewport et la page
 *    défilerait de quelques dizaines de pixels. On ramène ce plancher à
 *    `100svh`. Une règle hors couche l'emporte toujours sur `@layer base`,
 *    aucun `!important` n'est nécessaire.
 * 2. Sur les écrans très bas, le compte à rebours — seul élément déclaré
 *    optionnel — s'efface pour garantir que rien d'essentiel ne soit coupé.
 *
 * Ces règles ne vivent que le temps où la page est montée : React retire le
 * <style> à la navigation, les autres pages ne sont jamais affectées.
 */
const IMMERSIVE_CSS = `
html, body { min-height: 100svh; }
@media (max-height: 620px) { [data-ouverture-compte-a-rebours] { display: none; } }

/* Plafond de la vidéo — piloté ici plutôt qu'en style inline, qu'aucune media
   query ne pourrait surcharger.
   · Mobile : 34svh, le texte et les CTA priment.
   · Desktop et tablette paysage (>= 1024px) : 56svh et jusqu'à 55rem, la vidéo
     devient le point focal. Le ratio 16/9 est porté par le cadre lui-même
     (OpeningVideo), la hauteur suit donc automatiquement la largeur. */
[data-ouverture-video] { max-width: min(100%, 40rem, calc(34svh * 16 / 9)); }
@media (min-width: 1024px) {
  [data-ouverture-video] { max-width: min(100%, 55rem, calc(56svh * 16 / 9)); }
}
`

const OG_IMAGE = ogImage({
  eyebrow: OPENING_SEO.ogEyebrow,
  title: OPENING_SEO.ogTitle,
  subtitle: OPENING_SEO.ogSubtitle,
})

export const metadata: Metadata = {
  // `absolute` court-circuite le gabarit « %s | CIER » du layout racine : le
  // titre de campagne doit être exactement celui validé pour le partage social.
  title: { absolute: OPENING_SEO.title },
  description: OPENING_SEO.description,
  keywords: [
    'ouverture La Citadelle',
    'église digitale',
    'plateforme croissance spirituelle',
    OPENING_SEO.keyword,
    'maison digitale chrétienne',
    'parcours spirituel en ligne',
  ],
  alternates: { canonical: OUVERTURE_ROUTES.entree },
  openGraph: {
    type: 'website',
    url: OUVERTURE_ROUTES.entree,
    title: OPENING_SEO.title,
    description: OPENING_SEO.description,
    images: [
      {
        // Image sociale générée par /api/og (1200×630, palette de la marque).
        // À remplacer par un visuel dédié dès qu'il est fourni.
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: OPENING_SEO.ogAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OPENING_SEO.title,
    description: OPENING_SEO.description,
    images: [OG_IMAGE],
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
      <style dangerouslySetInnerHTML={{ __html: IMMERSIVE_CSS }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }}
      />
      {/* Cette page vit hors du groupe `(public)` : elle n'a ni Navbar ni
          Footer, et doit donc porter elle-même le `<main id="main-content">`
          visé par le lien d'évitement du layout racine. */}
      <main id="main-content" tabIndex={-1}>
        <EntreeContent initialOpen={open} initialCountdown={countdown} video={video} />
      </main>
    </>
  )
}

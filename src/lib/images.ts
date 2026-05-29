/**
 * CIER Platform — Image Catalog
 *
 * Curated premium imagery for the cinematic dark royal aesthetic.
 *
 * Sources:
 *   - Local SVG artwork in /public/images/* (always available, repo-bundled)
 *   - Remote photo URLs (Unsplash, Pexels, chapelleduroyaume.org) — whitelisted
 *     in next.config.js > images.remotePatterns
 *
 * Each entry carries a primary `src`, an optional `srcRemote` (a real photo
 * the team can swap in when ready), `alt` text, and a brand-aligned `palette`
 * for fallback gradients while images load.
 */
import type { PlatformeId } from '@/types'

export interface CieerImage {
  /** Local-first path. Always present. Used as `next/image` src. */
  src: string
  /** Optional real-photo URL (Unsplash, Pexels, chapelleduroyaume.org). Drop-in replacement once vetted. */
  srcRemote?: string
  /** Alt text — required for a11y. */
  alt: string
  /** Native dimensions of the local artwork (used by `next/image` for layout). */
  width: number
  height: number
  /** Brand colors used in the artwork — for matching gradients/borders. */
  palette: { primary: string; secondary?: string }
}

// ============================================================================
// HERO IMAGERY
// ============================================================================

export const HERO_IMAGES = {
  cathedral: {
    src: '/images/hero/cathedral.svg',
    alt: 'Cathédrale royale baignée de lumière dorée',
    width: 1920,
    height: 1080,
    palette: { primary: '#D4AF37', secondary: '#4B0082' },
  },
  worship: {
    src: '/images/hero/worship.svg',
    alt: 'Foule en adoration sous des projecteurs dorés',
    width: 1920,
    height: 1080,
    palette: { primary: '#D4AF37', secondary: '#1a0533' },
  },
  crest: {
    src: '/images/hero/crest.svg',
    alt: 'Emblème royal CIER avec couronne et croix',
    width: 800,
    height: 800,
    palette: { primary: '#D4AF37', secondary: '#4B0082' },
  },
  podcast: {
    src: '/images/hero/podcast.svg',
    alt: 'Studio podcast — micro et ondes sonores dorées',
    width: 1600,
    height: 900,
    palette: { primary: '#D4AF37', secondary: '#1a0533' },
  },
  welcome: {
    src: '/images/hero/welcome.svg',
    alt: 'Portes du Royaume ouvertes sur la lumière',
    width: 1600,
    height: 900,
    palette: { primary: '#F5E6A7', secondary: '#4B0082' },
  },
} as const satisfies Record<string, CieerImage>

export type HeroImageKey = keyof typeof HERO_IMAGES

// ============================================================================
// PLATFORM IMAGERY (one per ministère)
// ============================================================================

export const PLATFORM_IMAGES: Record<PlatformeId, CieerImage> = {
  cier: {
    src: '/images/platforms/cier.svg',
    alt: 'CIER — Corps principal de la Chapelle',
    width: 800,
    height: 500,
    palette: { primary: '#D4AF37', secondary: '#4B0082' },
  },
  'chapelle-familiale': {
    src: '/images/platforms/chapelle-familiale.svg',
    alt: 'Chapelle Familiale — foyer et flamme partagée',
    width: 800,
    height: 500,
    palette: { primary: '#F97316', secondary: '#7C2D12' },
  },
  jeunesse: {
    src: '/images/platforms/jeunesse.svg',
    alt: 'Jeunesse — feu de la génération',
    width: 800,
    height: 500,
    palette: { primary: '#9333EA', secondary: '#4C1D95' },
  },
  'femmes-exceptions': {
    src: '/images/platforms/femmes-exceptions.svg',
    alt: "Femmes d'Exceptions — couronne et grâce",
    width: 800,
    height: 500,
    palette: { primary: '#EC4899', secondary: '#831843' },
  },
  'cite-refuge': {
    src: '/images/platforms/cite-refuge.svg',
    alt: 'Cité du Refuge — maison de restauration',
    width: 800,
    height: 500,
    palette: { primary: '#14B8A6', secondary: '#134E4A' },
  },
  cfic: {
    src: '/images/platforms/cfic.svg',
    alt: 'CFIC — Académie biblique',
    width: 800,
    height: 500,
    palette: { primary: '#8B5CF6', secondary: '#4C1D95' },
  },
  mahanaim: {
    src: '/images/platforms/mahanaim.svg',
    alt: 'Mahanaïm — intercession et prière 24/7',
    width: 800,
    height: 500,
    palette: { primary: '#7C3AED', secondary: '#3B0764' },
  },
  'familles-chapelle': {
    src: '/images/platforms/familles-chapelle.svg',
    alt: 'Familles de la Chapelle — réseau de cellules',
    width: 800,
    height: 500,
    palette: { primary: '#22C55E', secondary: '#14532D' },
  },
}

// ============================================================================
// HELPERS
// ============================================================================

/** Pick a hero image with type-safe key fallback. */
export function getHeroImage(key: HeroImageKey): CieerImage {
  return HERO_IMAGES[key]
}

/** Pick a platform image; returns CIER fallback if the id is unknown. */
export function getPlatformImage(id: string): CieerImage {
  return (PLATFORM_IMAGES as Record<string, CieerImage>)[id] ?? PLATFORM_IMAGES.cier
}

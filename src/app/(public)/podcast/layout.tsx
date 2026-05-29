import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Podcast CIER — Enseignements & Méditations',
  description:
    "Le podcast officiel de La Chapelle Internationale. Enseignements bibliques, méditations, leadership chrétien — disponibles partout (Spotify, Apple, YouTube).",
  keywords: ['podcast chrétien francophone', 'enseignement biblique audio', 'méditation chrétienne', 'CIER podcast'],
  openGraph: {
    title: 'Podcast CIER',
    description: 'Enseignements profonds et méditations spirituelles, partout, à toute heure.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Podcast officiel', title: 'Enseignements & Méditations', subtitle: 'Spotify · Apple Podcasts · YouTube — partout, à toute heure.' })],
  },
  alternates: { canonical: '/podcast' },
}

export default function PodcastLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

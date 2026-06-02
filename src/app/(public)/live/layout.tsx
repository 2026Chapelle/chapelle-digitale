import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Live & Cultes en Direct',
  description:
    "Suivez les cultes, veillées et enseignements de La Chapelle Internationale en direct depuis n'importe où dans le monde. Streaming HD, chat communautaire, replays.",
  keywords: ['culte en direct', 'live streaming chrétien', 'veillée prière', 'culte dimanche', 'CIER live'],
  openGraph: {
    title: 'Live & Cultes en Direct — CIER',
    description:
      "Une expérience cultuelle immersive. Cultes, enseignements, veillées — accessibles partout dans le monde.",
    type: 'website',
    images: [ogImage({ eyebrow: 'En direct', title: 'Cultes & enseignements en direct', subtitle: 'Streaming HD · Chat communautaire · Replays — accessibles partout dans le monde.' })],
  },
  alternates: { canonical: '/live' },
}

export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

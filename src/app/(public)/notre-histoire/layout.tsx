import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Notre Histoire — 28 Ans de Mission',
  description:
    "L'histoire de La Chapelle Internationale des Élus du Royaume : de la naissance à l'expansion mondiale. Vision, valeurs, leadership et impact en 120+ nations.",
  keywords: ['histoire CIER', 'fondation église', 'vision chrétienne', 'mission mondiale francophone'],
  openGraph: {
    title: 'Notre Histoire — CIER',
    description: '28 ans de transformation spirituelle, de Kinshasa aux nations.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Notre histoire', title: '28 ans de mission', subtitle: 'De Kinshasa aux nations — vision, leadership et impact en 120+ pays.' })],
  },
  alternates: { canonical: '/notre-histoire' },
}

export default function NotreHistoireLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

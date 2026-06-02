import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Notre Histoire & Vision',
  description:
    "L'histoire de La Chapelle Internationale des Élus du Royaume (CIER) : une vision reçue en 2018 de répandre l'Évangile dans les nations. Vision, valeurs et leadership.",
  keywords: ['histoire CIER', 'fondation église', 'vision chrétienne', 'Abidjan'],
  openGraph: {
    title: 'Notre Histoire & Vision — CIER',
    description: "Une Église née d'une vision : répandre l'Évangile dans les nations.",
    type: 'website',
    images: [ogImage({ eyebrow: 'Notre histoire', title: 'Une Église ouverte au monde', subtitle: "Une vision reçue en 2018 — l'Évangile pour les nations." })],
  },
  alternates: { canonical: '/notre-histoire' },
}

export default function NotreHistoireLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Témoignages de la Communauté',
  description:
    "Découvrez les témoignages authentiques de membres de La Chapelle Internationale du monde entier. Conversions, guérisons, transformations spirituelles.",
  keywords: ['témoignage chrétien', 'transformation spirituelle', 'guérison foi', 'CIER témoigner'],
  openGraph: {
    title: 'Témoignages — CIER',
    description: "Des vies transformées par la rencontre avec Christ. Lisez et partagez votre histoire.",
    type: 'website',
    images: [ogImage({ eyebrow: 'Témoignages', title: 'Des vies transformées', subtitle: 'Conversions, guérisons, restaurations — la communauté CIER raconte.' })],
  },
  alternates: { canonical: '/temoignages' },
}

export default function TemoignagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

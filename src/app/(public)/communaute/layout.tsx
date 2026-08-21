import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'
import { homeBreadcrumb, serializeJsonLd } from '@/lib/intelligence/seo/technical/jsonld'

export const metadata: Metadata = {
  title: 'La Communauté du Royaume',
  description:
    "Découvrez la communauté de la Chapelle Internationale des Élus du Royaume : plateformes, cellules, groupes et vie fraternelle d’une Église digitale mondiale francophone.",
  keywords: ['communauté chrétienne', 'famille spirituelle', 'église en ligne', 'CIER communauté'],
  openGraph: {
    title: 'La Communauté du Royaume',
    description: 'Une famille spirituelle mondiale — plateformes, cellules et groupes.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Communauté', title: 'La Communauté du Royaume', subtitle: 'Plateformes · Cellules · Groupes · Vie fraternelle' })],
  },
  alternates: { canonical: '/communaute' },
}

export default function CommunauteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeBreadcrumb('Communauté', '/communaute')) }}
      />
      {children}
    </>
  )
}

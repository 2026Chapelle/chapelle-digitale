import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'
import { homeBreadcrumb, serializeJsonLd } from '@/lib/intelligence/seo/technical/jsonld'

export const metadata: Metadata = {
  title: 'Le Parcours du Royaume',
  description:
    "Le Parcours du Royaume : un chemin de foi en quatre mouvements — de la découverte à l’envoi. Grandissez pas à pas dans la Chapelle Internationale des Élus du Royaume (CIER).",
  keywords: ['parcours de foi', 'croissance spirituelle', 'discipulat', 'CIER parcours'],
  openGraph: {
    title: 'Le Parcours du Royaume',
    description: 'Un chemin de foi en quatre mouvements — de la découverte à l’envoi.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Parcours', title: 'Le Parcours du Royaume', subtitle: 'Un chemin de foi en quatre mouvements' })],
  },
  alternates: { canonical: '/parcours' },
}

export default function ParcoursLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeBreadcrumb('Parcours', '/parcours')) }}
      />
      {children}
    </>
  )
}

import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'
import { homeBreadcrumb, serializeJsonLd } from '@/lib/intelligence/seo/technical/jsonld'

export const metadata: Metadata = {
  title: 'Servir & Rejoindre une Équipe',
  description:
    "Mettez vos dons au service du Royaume : louange, média, accueil, intercession, enfants et plus. Rejoignez une équipe de la Chapelle Internationale des Élus du Royaume (CIER).",
  keywords: ['servir église', 'bénévolat chrétien', 'équipe ministère', 'CIER servir'],
  openGraph: {
    title: 'Servir dans le Royaume',
    description: 'Mettez vos dons au service de l’Église. Rejoignez une équipe.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Servir', title: 'Mettez vos dons au service du Royaume', subtitle: 'Louange · Média · Accueil · Intercession · Enfants' })],
  },
  alternates: { canonical: '/servir' },
}

export default function ServirLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeBreadcrumb('Servir', '/servir')) }}
      />
      {children}
    </>
  )
}

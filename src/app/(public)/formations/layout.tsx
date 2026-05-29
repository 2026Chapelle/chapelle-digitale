import type { Metadata } from 'next'
import { FORMATIONS } from '@/lib/mock/formations'
import { ogImage } from '@/lib/og'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cier.org'

export const metadata: Metadata = {
  title: 'Formations Bibliques & Spirituelles',
  description:
    "Catalogue de formations CIER : École de Prière, Leader de Demain, Fondements de la Foi, Herméneutique, Mariage chrétien... 20+ parcours certifiants.",
  keywords: ['formation biblique', 'école de prière', 'discipulat', 'leadership chrétien', 'herméneutique', 'CFIC'],
  openGraph: {
    title: 'Formations CIER',
    description: '20+ parcours certifiants pour grandir dans la foi, le leadership et le service.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Formations CIER', title: '20+ parcours certifiants', subtitle: 'École de Prière · Leader de Demain · Fondements de la Foi · CFIC' })],
  },
  alternates: { canonical: '/formations' },
}

export default function FormationsLayout({ children }: { children: React.ReactNode }) {
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Catalogue des Formations CIER',
    numberOfItems: FORMATIONS.length,
    itemListElement: FORMATIONS.map((f, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${APP_URL}/formations/${f.slug}`,
      name: f.titre,
    })),
  }
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      {children}
    </>
  )
}

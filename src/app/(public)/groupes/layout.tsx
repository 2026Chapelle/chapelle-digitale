import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Cellules & Groupes Locaux',
  description:
    "Trouvez votre cellule de croissance dans votre ville. Groupes de prière, étude biblique, jeunesse, intercession — partout dans le monde francophone.",
  keywords: ['cellule chrétienne', 'groupe de prière', 'communauté locale', 'CIER groupes'],
  openGraph: {
    title: 'Cellules CIER',
    description: 'Une famille spirituelle près de chez vous.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Cellules locales', title: 'Une famille près de chez vous', subtitle: 'Prière · Étude biblique · Jeunesse · Intercession — partout dans le monde francophone.' })],
  },
  alternates: { canonical: '/groupes' },
}

export default function GroupesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

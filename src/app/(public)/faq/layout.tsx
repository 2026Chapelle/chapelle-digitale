import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Questions Fréquentes',
  description:
    'Toutes les réponses à vos questions sur La Chapelle Internationale : adhésion, dons, formations, doctrine, événements, ministères.',
  keywords: ['FAQ CIER', 'questions église', 'aide adhésion', 'doctrine chrétienne'],
  openGraph: {
    title: 'FAQ — CIER',
    description: 'Trouvez rapidement la réponse à vos questions.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Centre d’aide', title: 'Questions Fréquentes', subtitle: 'Adhésion, dons, formations, doctrine, ministères — toutes les réponses.' })],
  },
  alternates: { canonical: '/faq' },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

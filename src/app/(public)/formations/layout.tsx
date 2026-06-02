import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Formations Bibliques & Spirituelles',
  description:
    'Catalogue de formations de la CIER : parcours bibliques, discipulat, leadership et service.',
  keywords: ['formation biblique', 'discipulat', 'leadership chrétien', 'CIER'],
  openGraph: {
    title: 'Formations CIER',
    description: 'Des parcours pour grandir dans la foi, le leadership et le service.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Formations CIER', title: 'Parcours bibliques & discipulat', subtitle: 'Grandir dans la foi, le leadership et le service' })],
  },
  alternates: { canonical: '/formations' },
}

export default function FormationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

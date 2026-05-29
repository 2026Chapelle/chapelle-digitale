import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Rejoindre la Chapelle — Plans & Adhésion',
  description:
    "Devenez membre de La Chapelle Internationale des Élus du Royaume. Plans gratuits et premium, formations, communauté mondiale, accompagnement spirituel.",
  keywords: ['adhésion église', 'devenir membre CIER', 'communauté chrétienne francophone', 'discipulat'],
  openGraph: {
    title: 'Rejoindre la Chapelle — CIER',
    description: 'Une communauté mondiale francophone vous attend. Inscription gratuite, parcours de discipolat, communauté locale.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Adhésion', title: 'Rejoindre la Chapelle', subtitle: 'Une communauté mondiale francophone — inscription gratuite, parcours de discipolat.' })],
  },
  alternates: { canonical: '/rejoindre' },
}

export default function RejoindreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

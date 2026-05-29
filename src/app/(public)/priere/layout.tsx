import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Mur de Prière Communautaire',
  description:
    "Soumettez vos demandes de prière et intercédez pour la communauté CIER. Mur de prière en temps réel, modération bienveillante, anonymat possible.",
  keywords: ['prière en ligne', 'demande de prière', 'intercession communautaire', 'mur de prière'],
  openGraph: {
    title: 'Mur de Prière — CIER',
    description: 'Intercession 24/7 — déposez vos demandes, priez pour la communauté.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Mur de prière', title: 'Intercession communautaire 24/7', subtitle: 'Déposez vos demandes, priez pour la communauté — anonymat possible.' })],
  },
  alternates: { canonical: '/priere' },
}

export default function PriereLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

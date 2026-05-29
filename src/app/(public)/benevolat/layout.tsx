import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Bénévolat & Service',
  description:
    "Servez avec nous. Équipes louange, accueil, technique, intercession, communication. Découvrez les opportunités de service et postulez en ligne.",
  keywords: ['bénévolat chrétien', 'serveur église', 'volontariat ministère', 'CIER équipes'],
  openGraph: {
    title: 'Bénévolat — CIER',
    description: 'Mettez vos dons au service du Royaume.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Bénévolat', title: 'Servez avec nous', subtitle: 'Louange · Accueil · Technique · Intercession · Communication' })],
  },
  alternates: { canonical: '/benevolat' },
}

export default function BenevolatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Faire un Don — Dîme, Offrande, Partenariat',
  description:
    'Soutenez la mission de La Chapelle Internationale. Dîme, offrande, partenariat ou don aux campagnes (Construction Temple, Missions, Bourses CFIC). Paiement sécurisé.',
  keywords: ['don église', 'dîme', 'offrande chrétienne', 'partenariat ministère', 'CIER soutenir'],
  openGraph: {
    title: 'Faire un Don — CIER',
    description: 'Investissez dans le Royaume. Dîme, offrande, partenariats financiers et campagnes ministérielles.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Soutenir la mission', title: 'Investir dans le Royaume', subtitle: 'Dîme, offrande, partenariats — paiement sécurisé, reçu fiscal.' })],
  },
  alternates: { canonical: '/dons' },
}

export default function DonsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

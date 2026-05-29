import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Plateformes Ministérielles',
  description:
    "Découvrez les 8 plateformes de La Chapelle : CIER Global, Jeunesse, Femmes d'Exceptions, Chapelle Familiale, CFIC, Mahanaïm, Cité du Refuge, Familles.",
  keywords: ['ministère chrétien', 'jeunesse chrétienne', 'femmes chrétiennes', 'famille chrétienne', 'CFIC', 'Mahanaïm'],
  openGraph: {
    title: 'Plateformes CIER',
    description: '8 plateformes pour 8 saisons de vie. Trouvez votre famille spirituelle.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Plateformes ministérielles', title: '8 plateformes, 8 saisons de vie', subtitle: 'Jeunesse · Femmes · Familles · CFIC · Mahanaïm · Cité du Refuge — votre famille spirituelle.' })],
  },
  alternates: { canonical: '/plateformes' },
}

export default function PlateformesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

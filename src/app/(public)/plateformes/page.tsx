import type { Metadata } from 'next'
import PlateformesListPage from './PlateformesListPage'

export const metadata: Metadata = {
  title: 'Nos Ministères — 8 Plateformes, Une Seule Vision',
  description:
    'Les 8 ministères autonomes et complémentaires de la Chapelle Internationale des Élus du Royaume — CIER, CFIC, Mahanaïm, Chapelle Familiale, Familles de la Chapelle, Femmes d’Exceptions, Jeunesse de la Chapelle, Cité du Refuge. Une seule vision : faire des disciples de toutes les nations.',
  alternates: { canonical: '/plateformes' },
  openGraph: {
    type: 'website',
    url: '/plateformes',
    title: 'Nos Ministères — 8 Plateformes, Une Seule Vision',
    description: 'Une famille de 8 ministères complémentaires, au service d’une seule vision.',
    images: [{
      url: '/api/og?title=Nos%20Minist%C3%A8res&subtitle=8%20Plateformes%2C%20Une%20Seule%20Vision',
      width: 1200, height: 630, alt: 'Nos Ministères — 8 Plateformes, Une Seule Vision',
    }],
  },
}

export default function Page() {
  return <PlateformesListPage />
}

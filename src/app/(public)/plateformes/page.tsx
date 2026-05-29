import type { Metadata } from 'next'
import PlateformesListPage from './PlateformesListPage'

export const metadata: Metadata = {
  title: 'Nos Plateformes Ministérielles | CIER',
  description: 'Découvrez les 8 ministères de la Chapelle Internationale des Élus du Royaume — CIER, Jeunesse, Femmes, CFIC, Intercession et plus.',
}

export default function Page() {
  return <PlateformesListPage />
}

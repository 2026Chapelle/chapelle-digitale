import type { Metadata } from 'next'
import { ReveilVaillantsLanding } from './ReveilVaillantsLanding'

export const metadata: Metadata = {
  title: 'Le Réveil des Vaillants | Citadelle',
  description: 'Novembre 2026 : le temps de prendre possession est arrivé ! Se lever, s’équiper, s’engager et conquérir. Josué 1:11.',
  robots: { index: true, follow: true }, // Campagne publique
}

export default function ReveilDesVaillantsPage() {
  return <ReveilVaillantsLanding />
}

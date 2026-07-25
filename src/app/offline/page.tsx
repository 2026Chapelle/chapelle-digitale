import { OfflineFallbackScreen } from '@/components/features/offline/OfflineFallbackScreen'

// Page de secours hors ligne — générique, sans donnée serveur personnalisée.
// Statique (précachée par le service worker à l'installation).
export const dynamic = 'force-static'

export const metadata = {
  title: 'Hors connexion — Citadelle',
  description: 'Tes contenus téléchargés restent disponibles hors ligne.',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return <OfflineFallbackScreen />
}

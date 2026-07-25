import { OfflineLibrary } from '@/components/features/offline/OfflineLibrary'

export const metadata = {
  title: 'Mes contenus hors ligne — Citadelle',
  description: 'PDF et audios téléchargés, consultables sans connexion.',
}

export default function HorsLignePage() {
  return <OfflineLibrary />
}

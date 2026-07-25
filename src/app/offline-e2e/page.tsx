import { notFound } from 'next/navigation'
import { isOfflineE2EServer } from '@/lib/offline/e2e-guard'
import { OfflineE2EHarness } from './OfflineE2EHarness'

/**
 * Page du harnais E2E offline (Lot Offline 1.2).
 *
 * GARDÉE : rendue UNIQUEMENT si `OFFLINE_E2E_MODE=true` ET qu'aucun signal de
 * production n'est présent (`isOfflineE2EServer` lève sinon → 500 immédiat).
 * En production le flag est absent → `notFound()` (404). Il n'existe donc AUCUN
 * chemin d'activation en production.
 */
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Offline E2E Harness',
  robots: { index: false, follow: false },
}

export default function OfflineE2EPage() {
  // Lève si un signal de production est détecté alors que le flag est armé ;
  // renvoie false (→ 404) si le flag n'est pas armé (cas de la production).
  if (!isOfflineE2EServer(process.env as Record<string, string | undefined>)) {
    notFound()
  }
  return <OfflineE2EHarness />
}

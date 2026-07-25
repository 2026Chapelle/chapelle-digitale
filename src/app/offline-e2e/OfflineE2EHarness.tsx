'use client'
/**
 * Harnais E2E offline (CÔTÉ CLIENT) — Lot Offline 1.2.
 *
 * Monte les VRAIS composants offline de production (`OfflineDownloadButton`,
 * `OfflineLibrary`, et par ricochet `OfflineAudioPlayer` / `OfflinePdfViewer`)
 * en leur injectant un contexte d'auth FACTICE — uniquement dans ce sous-arbre,
 * rendu par une page qui ne s'affiche qu'en `OFFLINE_E2E_MODE` (cf. page.tsx).
 *
 * Les endpoints `/api/member/offline/{authorize,download}` NE sont PAS modifiés :
 * ils sont mockés au niveau réseau par Playwright (`tests/offline-e2e`). Ici on
 * exerce donc la chaîne cliente réelle : bouton → manager → IndexedDB → lecteurs.
 *
 * ⚠️ Aucun secret, aucune donnée réelle : contenus 100 % factices déterministes.
 */
import { AuthContext } from '@/components/providers/AuthProvider'
import { OfflineDownloadButton } from '@/components/features/offline/OfflineDownloadButton'
import { OfflineLibrary } from '@/components/features/offline/OfflineLibrary'

/** Identités & contenus factices — DOIVENT correspondre aux mocks Playwright. */
export const E2E_USER_ID = 'offline-e2e-user'
export const E2E_FIXTURES = [
  { contentId: 'e2e-pdf-001', type: 'pdf' as const, title: 'Fixture PDF E2E' },
  { contentId: 'e2e-audio-001', type: 'audio' as const, title: 'Fixture Audio E2E' },
]

/** Contexte d'auth factice : un membre local, jamais démo, jamais chargé. */
const FAKE_AUTH = {
  user: { id: E2E_USER_ID, email: 'offline-e2e@local.test' } as any,
  profile: { id: E2E_USER_ID, role: 'membre', email: 'offline-e2e@local.test' } as any,
  role: 'membre',
  loading: false,
  isDemo: false,
  signOut: async () => {},
}

export function OfflineE2EHarness() {
  return (
    <AuthContext.Provider value={FAKE_AUTH}>
      <div data-testid="offline-e2e-root" className="min-h-screen bg-abyss px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-cinzel text-lg text-pearl" data-testid="offline-e2e-title">
            Harnais E2E hors-ligne — environnement isolé
          </h1>
          <p className="mt-1 text-xs text-amber-300" data-testid="offline-e2e-banner">
            OFFLINE_E2E_MODE — contenus factices, aucune donnée réelle.
          </p>

          {/* Zone de « téléchargement » : vrais boutons de production, contenus factices. */}
          <section className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <h2 className="text-sm text-pearl/80">Ressources téléchargeables (fixtures)</h2>
            <ul className="mt-3 space-y-3">
              {E2E_FIXTURES.map((f) => (
                <li
                  key={f.contentId}
                  data-testid={`offline-e2e-fixture-${f.contentId}`}
                  data-content-type={f.type}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] p-3"
                >
                  <span className="text-sm text-pearl">{f.title}</span>
                  <OfflineDownloadButton contentId={f.contentId} type={f.type} title={f.title} />
                </li>
              ))}
            </ul>
          </section>

          {/* Bibliothèque réelle (lecture IndexedDB, suppression, lecteurs PDF/audio). */}
          <section className="mt-6" data-testid="offline-e2e-library">
            <OfflineLibrary />
          </section>
        </div>
      </div>
    </AuthContext.Provider>
  )
}

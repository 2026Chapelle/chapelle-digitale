'use client'
/**
 * Écran de secours hors ligne (route /offline), servi par le service worker quand
 * une navigation échoue faute de réseau.
 *
 * Le HTML mis en cache est GÉNÉRIQUE (aucune donnée personnelle figée) : le
 * message d'en-tête est statique. La bibliothèque en dessous est rendue
 * CÔTÉ CLIENT à partir d'IndexedDB, scopée à la session locale (userId) — aucun
 * contenu d'un autre compte ne peut donc transiter par Cache Storage.
 */
import { RefreshCw } from 'lucide-react'
import { OfflineLibrary } from './OfflineLibrary'

export function OfflineFallbackScreen() {
  return (
    <div className="min-h-screen bg-abyss">
      <div className="mx-auto max-w-4xl px-4 pt-10">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h1 className="font-cinzel text-lg text-pearl">Tu es hors connexion</h1>
          <p className="mt-2 text-sm text-pearl/60">
            Les contenus que tu as déjà téléchargés restent disponibles dans ta bibliothèque hors ligne.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-abyss transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Réessayer
          </button>
        </div>
      </div>
      {/* Bibliothèque hors-ligne réutilisée (données locales IndexedDB). */}
      <OfflineLibrary />
    </div>
  )
}

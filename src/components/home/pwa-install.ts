'use client'
/**
 * Fondation PWA légère (V2.7-A) — capture partagée de l'événement `beforeinstallprompt`.
 *
 * Un singleton module capte l'événement une seule fois (avant que React ne monte) et le
 * rejoue à la demande depuis n'importe quel composant (popup, section « Installer »). Aucune
 * dépendance, aucun service worker. Si le navigateur ne supporte pas l'installation
 * automatique, `canInstall` reste faux → l'UI propose une aide manuelle.
 */
import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

/** Détecte si l'app tourne déjà en mode installé (standalone). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mm = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
  return !!mm || iosStandalone
}

export interface PwaInstall {
  canInstall: boolean
  installed: boolean
  promptInstall: () => Promise<boolean>
}

/** Hook d'installation PWA (partagé, réactif à la disponibilité du prompt). */
export function usePwaInstall(): PwaInstall {
  const [, setTick] = useState(0)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    setInstalled(isStandalone())
    return () => { listeners.delete(l) }
  }, [])

  async function promptInstall(): Promise<boolean> {
    if (!deferred) return false
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      deferred = null
      notify()
      return choice.outcome === 'accepted'
    } catch {
      return false
    }
  }

  return { canInstall: !!deferred, installed, promptInstall }
}

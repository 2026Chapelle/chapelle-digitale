'use client'
/**
 * Citadelle — Lot Offline 1 : signaux réseau (best-effort, HONNÊTES).
 *
 * Avertissement assumé : les navigateurs n'exposent PAS de façon fiable le type
 * de connexion. `navigator.connection` (Network Information API) est partiel
 * (Chromium seulement) et souvent absent. On ne SIMULE jamais une détection
 * Wi-Fi : on fournit une heuristique prudente + une préférence utilisateur.
 */
import { getSettings, putSettings, type OfflineSettings } from '@/lib/offline/db'

interface NavigatorConnectionLike {
  type?: string
  effectiveType?: string
  saveData?: boolean
}

function connection(): NavigatorConnectionLike | undefined {
  if (typeof navigator === 'undefined') return undefined
  const nav = navigator as Navigator & {
    connection?: NavigatorConnectionLike
    mozConnection?: NavigatorConnectionLike
    webkitConnection?: NavigatorConnectionLike
  }
  return nav.connection || nav.mozConnection || nav.webkitConnection
}

/**
 * Heuristique « connexion probablement facturée/mobile ». Renvoie false quand on
 * ne sait pas (on n'empêche jamais abusivement le téléchargement).
 */
export function isLikelyMetered(): boolean {
  const c = connection()
  if (!c) return false
  if (c.saveData) return true
  if (c.type) return c.type === 'cellular'
  // Sans `type`, on ne présume rien de fiable.
  return false
}

/** Le type de connexion est-il réellement connu du navigateur ? */
export function isConnectionTypeKnown(): boolean {
  return !!connection()?.type
}

export async function getWifiOnly(userId: string): Promise<boolean> {
  if (!userId) return false
  try {
    const s = await getSettings(userId)
    return !!s?.wifiOnly
  } catch {
    return false
  }
}

export async function setWifiOnly(userId: string, wifiOnly: boolean): Promise<void> {
  if (!userId) return
  const settings: OfflineSettings = {
    userId,
    wifiOnly,
    updatedAt: new Date().toISOString(),
  }
  await putSettings(settings)
}

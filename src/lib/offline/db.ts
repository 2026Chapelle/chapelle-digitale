'use client'
/**
 * Citadelle — Lot Offline 1 : couche IndexedDB (navigateur uniquement).
 *
 * Wrapper minimal et sans dépendance autour de l'API IndexedDB native (pas de
 * `idb`/`dexie` ajoutés). Toute la logique métier PURE vit dans `policy.ts` ;
 * ici on ne fait que de l'I/O de stockage.
 *
 * Isolation multi-comptes : chaque `OfflineItem` porte `userId` et l'index
 * `by_user` permet de ne lire QUE les contenus du compte courant. Les blobs sont
 * rangés dans un store séparé, clés opaques (jamais d'URL).
 */
import type { OfflineItem } from '@/lib/offline/policy'

const DB_NAME = 'citadelle-offline'
const DB_VERSION = 1

export const STORE_ITEMS = 'offline_items'
export const STORE_FILES = 'offline_files'
export const STORE_SETTINGS = 'offline_settings'

export interface OfflineSettings {
  userId: string
  /** Préférence « télécharger uniquement en Wi-Fi » (avertissement : détection
   *  réseau non fiable côté navigateur — cf. UI). */
  wifiOnly: boolean
  updatedAt: string
}

export interface StoredBlob {
  key: string
  blob: Blob
}

/** IndexedDB est-il disponible dans cet environnement ? */
export function isOfflineStorageSupported(): boolean {
  return typeof indexedDB !== 'undefined'
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (!isOfflineStorageSupported()) {
    return Promise.reject(new Error('IndexedDB indisponible dans ce navigateur.'))
  }
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_ITEMS)) {
        const items = db.createObjectStore(STORE_ITEMS, { keyPath: 'id' })
        items.createIndex('by_user', 'userId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'userId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Ouverture IndexedDB échouée.'))
  })
  return dbPromise
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const s = t.objectStore(store)
        const request = run(s)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

// --- Items -----------------------------------------------------------------

export function putItem(item: OfflineItem): Promise<IDBValidKey> {
  return tx(STORE_ITEMS, 'readwrite', (s) => s.put(item))
}

export function getItem(id: string): Promise<OfflineItem | undefined> {
  return tx<OfflineItem | undefined>(STORE_ITEMS, 'readonly', (s) => s.get(id) as IDBRequest<OfflineItem | undefined>)
}

/** Ne renvoie QUE les items du compte courant (isolation). */
export function getItemsByUser(userId: string): Promise<OfflineItem[]> {
  return openDB().then(
    (db) =>
      new Promise<OfflineItem[]>((resolve, reject) => {
        const t = db.transaction(STORE_ITEMS, 'readonly')
        const idx = t.objectStore(STORE_ITEMS).index('by_user')
        const request = idx.getAll(IDBKeyRange.only(userId))
        request.onsuccess = () => resolve((request.result as OfflineItem[]) ?? [])
        request.onerror = () => reject(request.error)
      }),
  )
}

export function deleteItem(id: string): Promise<void> {
  return tx<undefined>(STORE_ITEMS, 'readwrite', (s) => s.delete(id) as IDBRequest<undefined>).then(() => undefined)
}

// --- Blobs -----------------------------------------------------------------

export function putBlob(key: string, blob: Blob): Promise<IDBValidKey> {
  return tx(STORE_FILES, 'readwrite', (s) => s.put({ key, blob } as StoredBlob))
}

export function getBlob(key: string): Promise<Blob | undefined> {
  return tx<StoredBlob | undefined>(STORE_FILES, 'readonly', (s) => s.get(key) as IDBRequest<StoredBlob | undefined>).then(
    (r) => r?.blob,
  )
}

export function hasBlob(key: string): Promise<boolean> {
  return tx<number>(STORE_FILES, 'readonly', (s) => s.count(key) as IDBRequest<number>).then((n) => n > 0)
}

export function deleteBlob(key: string): Promise<void> {
  return tx<undefined>(STORE_FILES, 'readwrite', (s) => s.delete(key) as IDBRequest<undefined>).then(() => undefined)
}

// --- Settings --------------------------------------------------------------

export function getSettings(userId: string): Promise<OfflineSettings | undefined> {
  return tx<OfflineSettings | undefined>(STORE_SETTINGS, 'readonly', (s) => s.get(userId) as IDBRequest<OfflineSettings | undefined>)
}

export function putSettings(settings: OfflineSettings): Promise<IDBValidKey> {
  return tx(STORE_SETTINGS, 'readwrite', (s) => s.put(settings))
}

// --- Espace disque ---------------------------------------------------------

export interface StorageEstimate {
  usage: number | null
  quota: number | null
}

/** Estimation d'espace via l'API standard (best-effort). */
export async function estimateStorage(): Promise<StorageEstimate> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate()
      return { usage: est.usage ?? null, quota: est.quota ?? null }
    }
  } catch {
    /* ignore */
  }
  return { usage: null, quota: null }
}

/** Demande un stockage persistant (best-effort, non garanti par le navigateur). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      return await navigator.storage.persist()
    }
  } catch {
    /* ignore */
  }
  return false
}

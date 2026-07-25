import { describe, it, expect } from 'vitest'
import {
  MAX_OFFLINE_FILE_SIZE_BYTES,
  OFFLINE_VALIDITY_DAYS,
  makeItemId,
  belongsToUser,
  itemsForUser,
  validateSize,
  normalizeMime,
  isAllowedOfflineMime,
  validateMime,
  computeExpiresAt,
  isExpired,
  remainingValidityMs,
  isAccessStale,
  deriveItemState,
  isOpenable,
  computeDownloadPercent,
  shouldPersistPosition,
  resumePosition,
  formatBytes,
  type OfflineItem,
} from '@/lib/offline/policy'

const DAY = 24 * 60 * 60 * 1000

function baseItem(overrides: Partial<OfflineItem> = {}): OfflineItem {
  return {
    id: makeItemId('user-a', 'content-1'),
    userId: 'user-a',
    contentId: 'content-1',
    type: 'pdf',
    title: 'Guide de prière',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    downloadedBytes: 1024,
    downloadStatus: 'completed',
    localBlobKey: 'blob-1',
    ...overrides,
  }
}

describe('isolation multi-comptes', () => {
  it('makeItemId scope par utilisateur', () => {
    expect(makeItemId('u1', 'c1')).toBe('u1::c1')
    expect(makeItemId('u2', 'c1')).not.toBe(makeItemId('u1', 'c1'))
  })

  it('belongsToUser refuse un autre compte et une identité vide', () => {
    const item = baseItem({ userId: 'user-a' })
    expect(belongsToUser(item, 'user-a')).toBe(true)
    expect(belongsToUser(item, 'user-b')).toBe(false)
    expect(belongsToUser(item, '')).toBe(false)
  })

  it('itemsForUser ne renvoie jamais les contenus d’un autre compte', () => {
    const items = [
      baseItem({ id: 'user-a::c1', userId: 'user-a' }),
      baseItem({ id: 'user-b::c1', userId: 'user-b' }),
      baseItem({ id: 'user-a::c2', userId: 'user-a', contentId: 'c2' }),
    ]
    const forA = itemsForUser(items, 'user-a')
    expect(forA).toHaveLength(2)
    expect(forA.every((i) => i.userId === 'user-a')).toBe(true)
    expect(itemsForUser(items, 'user-b')).toHaveLength(1)
    expect(itemsForUser(items, 'inconnu')).toHaveLength(0)
  })
})

describe('validation taille', () => {
  it('accepte une taille normale', () => {
    expect(validateSize(5 * 1024 * 1024).ok).toBe(true)
  })
  it('refuse 0 / négatif / NaN', () => {
    expect(validateSize(0).ok).toBe(false)
    expect(validateSize(-1).ok).toBe(false)
    expect(validateSize(Number.NaN).ok).toBe(false)
  })
  it('refuse au-delà du plafond', () => {
    expect(validateSize(MAX_OFFLINE_FILE_SIZE_BYTES + 1).ok).toBe(false)
    expect(validateSize(MAX_OFFLINE_FILE_SIZE_BYTES).ok).toBe(true)
  })
})

describe('validation MIME', () => {
  it('normalise les paramètres', () => {
    expect(normalizeMime('Application/PDF; charset=binary')).toBe('application/pdf')
  })
  it('pdf n’accepte que application/pdf', () => {
    expect(isAllowedOfflineMime('pdf', 'application/pdf')).toBe(true)
    expect(isAllowedOfflineMime('pdf', 'audio/mpeg')).toBe(false)
    expect(isAllowedOfflineMime('pdf', 'text/html')).toBe(false)
  })
  it('audio accepte la whitelist audio', () => {
    expect(isAllowedOfflineMime('audio', 'audio/mpeg')).toBe(true)
    expect(isAllowedOfflineMime('audio', 'audio/mp4')).toBe(true)
    expect(isAllowedOfflineMime('audio', 'application/pdf')).toBe(false)
  })
  it('validateMime renvoie une raison en cas de refus', () => {
    const r = validateMime('pdf', 'text/html')
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('pdf')
  })
})

describe('expiration', () => {
  const t0 = new Date('2026-01-01T00:00:00.000Z').getTime()

  it('computeExpiresAt ajoute la validité par défaut (30 j)', () => {
    const exp = computeExpiresAt(new Date(t0).toISOString())
    expect(new Date(exp).getTime()).toBe(t0 + OFFLINE_VALIDITY_DAYS * DAY)
  })
  it('computeExpiresAt respecte une validité personnalisée', () => {
    const exp = computeExpiresAt(new Date(t0).toISOString(), 7)
    expect(new Date(exp).getTime()).toBe(t0 + 7 * DAY)
  })
  it('isExpired : avant / après la borne', () => {
    const item = baseItem({ expiresAt: new Date(t0 + 10 * DAY).toISOString() })
    expect(isExpired(item, t0)).toBe(false)
    expect(isExpired(item, t0 + 9 * DAY)).toBe(false)
    expect(isExpired(item, t0 + 10 * DAY)).toBe(true)
    expect(isExpired(item, t0 + 11 * DAY)).toBe(true)
  })
  it('isExpired sans expiresAt → non expiré', () => {
    expect(isExpired(baseItem({ expiresAt: undefined }), t0)).toBe(false)
  })
  it('remainingValidityMs borne à 0', () => {
    const item = baseItem({ expiresAt: new Date(t0 + 5 * DAY).toISOString() })
    expect(remainingValidityMs(item, t0)).toBe(5 * DAY)
    expect(remainingValidityMs(item, t0 + 6 * DAY)).toBe(0)
  })
})

describe('version d’accès', () => {
  it('détecte une divergence', () => {
    expect(isAccessStale('v1', 'v2')).toBe(true)
    expect(isAccessStale('v1', 'v1')).toBe(false)
  })
  it('pas de faux positif si une version manque', () => {
    expect(isAccessStale(undefined, 'v2')).toBe(false)
    expect(isAccessStale('v1', undefined)).toBe(false)
    expect(isAccessStale('v1', null)).toBe(false)
  })
})

describe('dérivation d’état UI', () => {
  const now = new Date('2026-02-01T00:00:00.000Z').getTime()
  const ctx = (over: Partial<Parameters<typeof deriveItemState>[1]> = {}) => ({
    nowMs: now,
    hasLocalFile: true,
    ...over,
  })

  it('queued / downloading', () => {
    expect(deriveItemState(baseItem({ downloadStatus: 'queued' }), ctx())).toBe('queued')
    expect(deriveItemState(baseItem({ downloadStatus: 'downloading' }), ctx())).toBe('downloading')
  })
  it('failed vs interrupted selon octets partiels', () => {
    expect(deriveItemState(baseItem({ downloadStatus: 'failed', downloadedBytes: 0 }), ctx())).toBe('failed')
    expect(deriveItemState(baseItem({ downloadStatus: 'failed', downloadedBytes: 500 }), ctx())).toBe('interrupted')
  })
  it('completed + blob présent + non expiré → available', () => {
    expect(deriveItemState(baseItem(), ctx())).toBe('available')
  })
  it('completed mais blob absent → missing', () => {
    expect(deriveItemState(baseItem(), ctx({ hasLocalFile: false }))).toBe('missing')
  })
  it('completed mais expiré → expired (prioritaire sur missing)', () => {
    const item = baseItem({ expiresAt: new Date(now - DAY).toISOString() })
    expect(deriveItemState(item, ctx())).toBe('expired')
  })
  it('accès révoqué serveur → expired même si blob présent', () => {
    expect(deriveItemState(baseItem(), ctx({ accessRevoked: true }))).toBe('expired')
  })
  it('version serveur différente → update_available', () => {
    const item = baseItem({ accessVersion: 'v1' })
    expect(deriveItemState(item, ctx({ serverAccessVersion: 'v2' }))).toBe('update_available')
  })
  it('isOpenable vrai pour available et update_available, faux sinon', () => {
    expect(isOpenable(baseItem(), ctx())).toBe(true)
    expect(isOpenable(baseItem({ accessVersion: 'v1' }), ctx({ serverAccessVersion: 'v2' }))).toBe(true)
    expect(isOpenable(baseItem(), ctx({ hasLocalFile: false }))).toBe(false)
    expect(isOpenable(baseItem({ downloadStatus: 'expired' }), ctx())).toBe(false)
  })
})

describe('progression & reprise', () => {
  it('computeDownloadPercent borne [0..100]', () => {
    expect(computeDownloadPercent(0, 100)).toBe(0)
    expect(computeDownloadPercent(50, 100)).toBe(50)
    expect(computeDownloadPercent(100, 100)).toBe(100)
    expect(computeDownloadPercent(150, 100)).toBe(100)
    expect(computeDownloadPercent(10, 0)).toBe(0)
  })
  it('shouldPersistPosition : throttle + force', () => {
    expect(shouldPersistPosition(1000, 1000 + 8000)).toBe(true)
    expect(shouldPersistPosition(1000, 1000 + 3000)).toBe(false)
    expect(shouldPersistPosition(1000, 1000 + 3000, true)).toBe(true)
  })
  it('resumePosition borne et repart de 0 près de la fin', () => {
    expect(resumePosition(0, 100)).toBe(0)
    expect(resumePosition(30, 100)).toBe(30)
    expect(resumePosition(99, 100)).toBe(0) // < 2s de la fin
    expect(resumePosition(200, 100)).toBe(0) // au-delà de la durée → reprise à 0
    expect(resumePosition(80, 100)).toBe(80) // borné mais valide
    expect(resumePosition(undefined, undefined)).toBe(0)
  })
})

describe('formatBytes', () => {
  it('formate en unités FR', () => {
    expect(formatBytes(0)).toBe('0 o')
    expect(formatBytes(512)).toBe('512 o')
    expect(formatBytes(1024)).toBe('1 Ko')
    expect(formatBytes(1_048_576)).toBe('1 Mo')
    expect(formatBytes(5 * 1_048_576)).toBe('5 Mo')
    expect(formatBytes(1_073_741_824)).toBe('1 Go')
  })
})

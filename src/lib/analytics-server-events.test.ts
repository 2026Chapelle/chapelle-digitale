import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }))

import {
  buildServerEventRow,
  idempotencyKey,
  isReservedSessionKey,
  isServerSignupEvent,
  recordServerEvent,
  sanitizeClientMeta,
  serverEventsEnabled,
} from './analytics-server-events'

const UID = '11111111-2222-4333-8444-555555555555'
const ON = { INTEL_SERVER_EVENTS: '1' } as unknown as NodeJS.ProcessEnv

/** Client Supabase factice : `existing` simule une ligne déjà présente, `insertError` un échec d'insert. */
function fakeClient(opts: { existing?: boolean; insertError?: { code?: string; message?: string } | null; throws?: boolean; hang?: boolean } = {}) {
  const inserted: Record<string, unknown>[] = []
  const client = {
    from: vi.fn((_table: string) => ({
      select: () => ({
        eq: () => ({
          limit: () => {
            if (opts.throws) return Promise.reject(new Error('network down'))
            if (opts.hang) return new Promise(() => {})
            return Promise.resolve({ data: opts.existing ? [{ id: 1 }] : [], error: null })
          },
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        inserted.push(row)
        return Promise.resolve({ error: opts.insertError ?? null })
      },
    })),
  }
  return { client, inserted }
}

describe('flag INTEL_SERVER_EVENTS', () => {
  it('est désactivé par défaut (absent, vide, 0, true)', () => {
    expect(serverEventsEnabled({} as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(serverEventsEnabled({ INTEL_SERVER_EVENTS: '' } as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(serverEventsEnabled({ INTEL_SERVER_EVENTS: '0' } as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(serverEventsEnabled({ INTEL_SERVER_EVENTS: 'true' } as unknown as NodeJS.ProcessEnv)).toBe(false)
    expect(serverEventsEnabled(ON)).toBe(true)
  })

  it("n'écrit rien quand le flag est coupé", async () => {
    const { client, inserted } = fakeClient()
    const r = await recordServerEvent({ kind: 'signup_complete', entityId: UID, userId: UID }, { client, env: {} as unknown as NodeJS.ProcessEnv })
    expect(r.status).toBe('disabled')
    expect(client.from).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })
})

describe('clés d’idempotence', () => {
  it('sont déterministes et préfixées par type métier', () => {
    expect(idempotencyKey('signup_complete', UID)).toBe(`signup:${UID}`)
    expect(idempotencyKey('lead_created', 'abc-123')).toBe('lead:abc-123')
    expect(idempotencyKey('newcomer_created', 'n_1')).toBe('newcomer:n_1')
  })

  it('refusent un identifiant vide, trop long ou non sûr', () => {
    expect(idempotencyKey('signup_complete', '')).toBeNull()
    expect(idempotencyKey('signup_complete', 'a'.repeat(129))).toBeNull()
    expect(idempotencyKey('lead_created', 'x@y.fr')).toBeNull()
    expect(idempotencyKey('lead_created', 'a b')).toBeNull()
  })
})

describe('ligne d’événement serveur', () => {
  it('porte une session réservée srv:, le type conversion et aucune donnée personnelle', () => {
    const row = buildServerEventRow({ kind: 'signup_complete', entityId: UID, userId: UID, path: '/bienvenue' })!
    expect(row.session_key).toBe(`srv:signup:${UID}`)
    expect(row.type).toBe('conversion')
    expect(row.category).toBe('inscription')
    expect(row.user_id).toBe(UID)
    expect(row.meta).toEqual({ origin: 'server', event: 'signup_complete', idem_key: `signup:${UID}`, v: 1 })
    expect(JSON.stringify(row)).not.toMatch(/@/)
  })

  it('ignore un userId qui n’est pas un UUID', () => {
    const row = buildServerEventRow({ kind: 'lead_created', entityId: 'm1', userId: 'pas-un-uuid' })!
    expect(row.user_id).toBeNull()
    expect(row.category).toBe('lead')
  })

  it('accepte des métadonnées techniques bornées, sans écraser origin/idem_key', () => {
    const row = buildServerEventRow({ kind: 'newcomer_created', entityId: 'n1', meta: { organization_id: 'org-1', origin: 'client', idem_key: 'x' } })!
    expect(row.category).toBe('nouveau_venu')
    expect(row.meta).toMatchObject({ origin: 'server', idem_key: 'newcomer:n1', organization_id: 'org-1' })
  })
})

describe('recordServerEvent — idempotence et échecs non bloquants', () => {
  it('insère une seule fois (pré-contrôle sur la clé)', async () => {
    const a = fakeClient()
    expect((await recordServerEvent({ kind: 'signup_complete', entityId: UID, userId: UID }, { client: a.client, env: ON })).status).toBe('inserted')
    expect(a.inserted).toHaveLength(1)
    const b = fakeClient({ existing: true })
    expect((await recordServerEvent({ kind: 'signup_complete', entityId: UID, userId: UID }, { client: b.client, env: ON })).status).toBe('duplicate')
    expect(b.inserted).toHaveLength(0)
  })

  it('traite une violation d’unicité (course, index L2) comme un doublon', async () => {
    const { client } = fakeClient({ insertError: { code: '23505', message: 'duplicate key' } })
    expect((await recordServerEvent({ kind: 'lead_created', entityId: 'm1' }, { client, env: ON })).status).toBe('duplicate')
  })

  it('ne lève jamais : erreur SQL, exception réseau ou délai dépassé => error', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const e1 = fakeClient({ insertError: { code: '23503', message: 'fk' } })
    expect((await recordServerEvent({ kind: 'signup_complete', entityId: UID, userId: UID }, { client: e1.client, env: ON })).status).toBe('error')
    const e2 = fakeClient({ throws: true })
    expect((await recordServerEvent({ kind: 'signup_complete', entityId: UID }, { client: e2.client, env: ON })).status).toBe('error')
    const e3 = fakeClient({ hang: true })
    expect((await recordServerEvent({ kind: 'signup_complete', entityId: UID }, { client: e3.client, env: ON, timeoutMs: 20 })).status).toBe('error')
    expect(warn.mock.calls.flat().join(' ')).not.toContain(UID)
    warn.mockRestore()
  })

  it('refuse une entrée invalide sans toucher la base', async () => {
    const { client } = fakeClient()
    expect((await recordServerEvent({ kind: 'lead_created', entityId: '' }, { client, env: ON })).status).toBe('invalid')
    expect(client.from).not.toHaveBeenCalled()
  })
})

describe('protection contre la falsification côté client', () => {
  it('réserve le préfixe srv: aux écritures serveur', () => {
    expect(isReservedSessionKey('srv:signup:x')).toBe(true)
    expect(isReservedSessionKey('SRV:x')).toBe(true)
    expect(isReservedSessionKey('3f1c-abc')).toBe(false)
  })

  it('retire origin et idem_key des métadonnées client', () => {
    expect(sanitizeClientMeta({ origin: 'server', idem_key: 'signup:x', a: 1 })).toEqual({ a: 1 })
    expect(sanitizeClientMeta(null)).toBeNull()
    expect(sanitizeClientMeta('x')).toBeNull()
    expect(sanitizeClientMeta([1])).toBeNull()
  })

  it('ne reconnaît comme inscription que l’événement serveur', () => {
    const server = buildServerEventRow({ kind: 'signup_complete', entityId: UID, userId: UID })!
    expect(isServerSignupEvent(server)).toBe(true)
    expect(isServerSignupEvent({ type: 'click', category: 'inscription', session_key: 's1', meta: null })).toBe(false)
    expect(isServerSignupEvent({ type: 'conversion', category: 'inscription', session_key: 's1', meta: { origin: 'server' } })).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Test comportemental de bout en bout (sans base réelle) :
 * le navigateur écrit via la VRAIE route /api/analytics/track dans une table en
 * mémoire, le serveur écrit via recordServerEvent, puis le VRAI compteur des
 * « pages convertissantes » (cockpit Gouvernement) lit cette même table.
 * Le constructeur de requêtes applique réellement eq / like / in / gte,
 * y compris le filtre JSON `meta->>origin`.
 */
const db = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, any>[]>, nextId: 1 }))

function readCol(row: Record<string, any>, col: string) {
  const m = /^(\w+)->>(\w+)$/.exec(col)
  if (m) { const j = row[m[1]]; return j && typeof j === 'object' ? (j[m[2]] == null ? null : String(j[m[2]])) : null }
  return row[col]
}
const likeToRe = (p: string) => new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$')

function table(name: string) {
  const preds: ((r: Record<string, any>) => boolean)[] = []
  const rows = () => (db.tables[name] ||= [])
  const run = () => rows().filter((r) => preds.every((p) => p(r)))
  const q: any = {
    select: () => q,
    eq: (c: string, v: unknown) => { preds.push((r) => readCol(r, c) === v); return q },
    like: (c: string, p: string) => { const re = likeToRe(p); preds.push((r) => typeof readCol(r, c) === 'string' && re.test(readCol(r, c))); return q },
    in: (c: string, vs: unknown[]) => { preds.push((r) => vs.includes(readCol(r, c))); return q },
    gte: (c: string, v: string) => { preds.push((r) => String(r[c]) >= v); return q },
    order: () => q,
    limit: (n: number) => Promise.resolve({ data: run().slice(0, n), error: null }),
    maybeSingle: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
    insert: (row: Record<string, any>) => {
      rows().push({ id: db.nextId++, created_at: new Date().toISOString(), ...row })
      return Promise.resolve({ error: null })
    },
    update: (patch: Record<string, any>) => ({
      eq: (c: string, v: unknown) => { for (const r of rows()) if (r[c] === v) Object.assign(r, patch); return Promise.resolve({ error: null }) },
    }),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ ok: true }), clientIp: () => '0.0.0.0' }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => table(t) } }))

import { POST as track } from '@/app/api/analytics/track/route'
import { recordServerEvent } from '@/lib/analytics-server-events'
import { isServerConversion, topConvertingPages } from './analytics-kpi'

const browser = (body: unknown) =>
  track({ text: async () => JSON.stringify(body), headers: new Headers({ 'user-agent': 'vitest' }) } as any)
const SINCE = new Date(Date.now() - 30 * 86400_000).toISOString()
const UID = '11111111-2222-4333-8444-555555555555'
const client = { from: (t: string) => table(t) }

describe('pages convertissantes — conversions forgées depuis le navigateur', () => {
  beforeEach(() => { db.tables = {}; db.nextId = 1 })

  it('une conversion envoyée par le navigateur (même avec meta.origin=server) n’est pas comptée', async () => {
    expect((await browser({ session: 'nav-1', type: 'conversion', category: 'inscription', path: '/pirate', meta: { origin: 'server' } })).status).toBe(204)
    expect((await browser({ session: 'srv:signup:x', type: 'conversion', category: 'inscription', path: '/pirate-srv' })).status).toBe(204)
    // La conversion forgée est bien stockée (télémétrie), mais sans marqueur serveur.
    const stored = db.tables.analytics_events.filter((e) => e.type === 'conversion')
    expect(stored).toHaveLength(1)
    expect(stored[0].meta).toEqual({})
    expect(isServerConversion(stored[0])).toBe(false)

    const pages = await topConvertingPages(client, SINCE)
    expect(pages.map((p) => p.label)).not.toContain('/pirate')
    expect(pages.map((p) => p.label)).not.toContain('/pirate-srv')
  })

  it('seule la conversion écrite par le serveur est comptée', async () => {
    await browser({ session: 'nav-1', type: 'conversion', category: 'inscription', path: '/pirate', meta: { origin: 'server' } })
    const r = await recordServerEvent(
      { kind: 'signup_complete', entityId: UID, userId: UID, path: '/bienvenue' },
      { client, env: { INTEL_SERVER_EVENTS: '1' } as unknown as NodeJS.ProcessEnv },
    )
    expect(r.status).toBe('inserted')
    expect(await topConvertingPages(client, SINCE)).toEqual([{ label: '/bienvenue', count: 1 }])
  })

  it('une ligne historique srv: sans meta.origin=server (avant L1) n’est pas comptée', async () => {
    db.tables.analytics_events = [
      { id: 1, session_key: 'srv:legacy', type: 'conversion', category: 'inscription', path: '/legacy', meta: null, created_at: new Date().toISOString() },
    ]
    expect((await topConvertingPages(client, SINCE)).map((p) => p.label)).not.toContain('/legacy')
  })

  it('sans conversion serveur : repli sur les clics don/formation, jamais inscription', async () => {
    await browser({ session: 'nav-2', type: 'click', category: 'inscription', path: '/rejoindre' })
    await browser({ session: 'nav-2', type: 'click', category: 'don', path: '/dons' })
    await browser({ session: 'nav-2', type: 'conversion', category: 'don', path: '/pirate-don' })
    const labels = (await topConvertingPages(client, SINCE)).map((p) => p.label)
    expect(labels).toContain('/dons')
    expect(labels).not.toContain('/rejoindre')
    expect(labels).not.toContain('/pirate-don')
  })
})

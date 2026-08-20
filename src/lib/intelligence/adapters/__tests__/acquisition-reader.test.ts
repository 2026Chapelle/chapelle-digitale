import { describe, it, expect } from 'vitest'
import { readAcquisition, type RowsDb } from '../acquisition-reader'

const W = { sinceTodayIso: '2026-08-19T00:00:00.000Z', nowIso: '2026-08-19T18:00:00.000Z' }

const SESSIONS = [
  { session_key: 'ka', user_id: 'u1', source: 'whatsapp', referrer: '', first_seen: '2026-08-19T08:00:00.000Z' },
  { session_key: 'kb', user_id: null, source: 'referral', referrer: 'https://www.chapelleduroyaume.org', first_seen: '2026-08-19T09:00:00.000Z' },
]

function fixtures(table: string, ops: { in: Record<string, string[]>; gte: Record<string, string> }): unknown[] {
  if (table === 'analytics_sessions') {
    if (ops.gte['first_seen']) return SESSIONS.map((s) => ({ source: s.source, referrer: s.referrer })) // visits
    if (ops.in['session_key']) return SESSIONS.filter((s) => ops.in['session_key'].includes(s.session_key))
    if (ops.in['user_id']) return SESSIONS.filter((s) => s.user_id && ops.in['user_id'].includes(s.user_id))
    return []
  }
  if (table === 'profiles') return [{ id: 'u1' }, { id: 'u2' }] // u2 has no session
  if (table === 'audio_listening_events') return [{ session_key: 'kb', user_id: null }, { session_key: null, user_id: 'u1' }]
  if (table === 'module_completions') return [{ user_id: 'u1' }]
  return []
}

function makeDb(errorTable?: string): RowsDb {
  return {
    from(table: string) {
      const ops = { in: {} as Record<string, string[]>, gte: {} as Record<string, string> }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        in: (col: string, vals: string[]) => { ops.in[col] = vals; return builder },
        gte: (col: string, val: string) => { ops.gte[col] = val; return builder },
        limit: () => builder,
        then: (resolve: (r: { data: unknown[] | null; error: { message: string } | null }) => unknown) =>
          resolve(errorTable === table ? { data: null, error: { message: 'boom' } } : { data: fixtures(table, ops), error: null }),
      }
      return { select: () => builder }
    },
  }
}

describe('readAcquisition (fetch + résolution first-touch)', () => {
  it('résout chaque conversion vers sa source first-touch', async () => {
    const raw = await readAcquisition(makeDb(), W)
    expect(raw.visits).toEqual([
      { source: 'whatsapp', referrer: '' },
      { source: 'referral', referrer: 'https://www.chapelleduroyaume.org' },
    ])
    // u1 → session ka whatsapp ; u2 → aucune session → null
    expect(raw.signupSources).toEqual(['whatsapp', null])
    // kb (session_key) → chapelle (referral + host chapelle) ; u1 → whatsapp
    expect(raw.podcastSources).toEqual(['chapelle', 'whatsapp'])
    expect(raw.parcoursSources).toEqual(['whatsapp'])
  })

  it('propage une erreur PostgREST', async () => {
    await expect(readAcquisition(makeDb('profiles'), W)).rejects.toThrow(/acquisition read failed on profiles/)
  })
})

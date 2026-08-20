import { describe, it, expect } from 'vitest'
import { readCampaigns } from '../campaign-reader'
import type { RowsDb } from '../acquisition-reader'

const W = { sinceTodayIso: '2026-08-20T00:00:00.000Z', nowIso: '2026-08-20T18:00:00.000Z' }

const KA = {
  session_key: 'ka', user_id: 'u1', source: 'whatsapp', referrer: '', first_seen: '2026-08-20T08:00:00.000Z',
  utm_campaign: 'culte_20260823', utm_medium: 'channel', utm_content: 'main_cta',
}

function fixtures(table: string, ops: { in: Record<string, string[]>; gte: Record<string, string> }): unknown[] {
  if (table === 'analytics_sessions') {
    if (ops.gte['first_seen']) {
      return [{ source: KA.source, referrer: KA.referrer, utm_campaign: KA.utm_campaign, utm_medium: KA.utm_medium, utm_content: KA.utm_content }]
    }
    if (ops.in['session_key']) return ops.in['session_key'].includes('ka') ? [KA] : []
    if (ops.in['user_id']) return ops.in['user_id'].includes('u1') ? [KA] : []
    return []
  }
  if (table === 'profiles') return [{ id: 'u1' }]
  if (table === 'audio_listening_events') return [{ session_key: 'ka', user_id: null }]
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

describe('readCampaigns (fetch + résolution first-touch avec UTM)', () => {
  it('porte campaign/medium/content de la session first-touch vers les conversions', async () => {
    const raw = await readCampaigns(makeDb(), W)
    expect(raw.visits).toEqual([
      { source: 'whatsapp', referrer: '', utm_campaign: 'culte_20260823', utm_medium: 'channel', utm_content: 'main_cta' },
    ])
    // signup (u1) → session ka ; podcast (session_key ka) → ka ; parcours (u1) → ka
    for (const rows of [raw.signupRows, raw.podcastRows, raw.parcoursRows]) {
      expect(rows).toHaveLength(1)
      expect(rows[0]?.utm_campaign).toBe('culte_20260823')
      expect(rows[0]?.utm_content).toBe('main_cta')
    }
  })

  it('propage une erreur (ex. colonnes utm absentes = migration non appliquée)', async () => {
    await expect(readCampaigns(makeDb('analytics_sessions'), W)).rejects.toThrow(/campaign read failed/)
  })
})

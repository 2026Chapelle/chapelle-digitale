import { describe, it, expect } from 'vitest'
import { executeCount, readOverviewCounts, type CountDb } from '../supabase-reader'
import type { CountWindow } from '../count-specs'

const W: CountWindow = {
  nowIso: '2026-08-19T18:00:00.000Z',
  sinceTodayIso: '2026-08-19T00:00:00.000Z',
  onlineSinceIso: '2026-08-19T17:58:30.000Z',
}

/** Faux client Supabase : builder chaînable + awaitable, compte par table. */
function fakeDb(counts: Record<string, number>, errorTable?: string): CountDb {
  return {
    from(table: string) {
      const builder: any = {
        eq: () => builder,
        in: () => builder,
        gte: () => builder,
        then: (resolve: (r: { count: number | null; error: { message: string } | null }) => unknown) =>
          resolve(
            errorTable === table
              ? { count: null, error: { message: 'boom' } }
              : { count: counts[table] ?? 0, error: null },
          ),
      }
      return { select: () => builder }
    },
  }
}

describe('supabase-reader (exécuteur impur, port injecté)', () => {
  it('executeCount renvoie le compte et 0 si null', async () => {
    const db = fakeDb({ profiles: 12 })
    await expect(executeCount(db, { table: 'profiles', filters: [] })).resolves.toBe(12)
    await expect(executeCount(db, { table: 'inconnue', filters: [] })).resolves.toBe(0)
  })

  it('executeCount lève sur erreur PostgREST', async () => {
    const db = fakeDb({}, 'analytics_events')
    await expect(
      executeCount(db, { table: 'analytics_events', filters: [] }),
    ).rejects.toThrow(/intelligence count failed on analytics_events/)
  })

  it('readOverviewCounts mappe chaque table vers sa clé', async () => {
    const db = fakeDb({
      analytics_events: 100,
      analytics_sessions: 5,
      profiles: 3,
      audio_listening_events: 40,
      module_completions: 7,
    })
    const counts = await readOverviewCounts(db, W)
    expect(counts).toEqual({
      pageViewsToday: 100,
      activeSessionsNow: 5,
      signupsToday: 3,
      podcastStartsToday: 40,
      lessonCompletionsToday: 7,
    })
  })
})

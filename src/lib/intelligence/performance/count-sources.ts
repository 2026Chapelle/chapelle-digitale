import { supabaseAdmin } from '@/lib/supabase'

export interface RangeCounts {
  visits: number | null
  signups: number | null
  podcastStarts: number | null
  progressions: number | null
}

export interface CountWindow {
  sinceIso: string
  untilIso: string
}

export type CountFilter =
  | { kind: 'eq'; col: string; val: string }
  | { kind: 'in'; col: string; vals: string[] }

export interface CountSpec {
  table: string
  timeColumn: string
  filters?: CountFilter[]
}

export const CITADELLE_COUNT_SPECS: Record<keyof RangeCounts, CountSpec> = {
  visits: { table: 'analytics_events', timeColumn: 'created_at', filters: [{ kind: 'eq', col: 'type', val: 'pageview' }] },
  signups: { table: 'profiles', timeColumn: 'created_at' },
  podcastStarts: {
    table: 'audio_listening_events',
    timeColumn: 'occurred_at',
    filters: [{ kind: 'in', col: 'event_type', vals: ['play_start', 'play_resume'] }],
  },
  progressions: { table: 'module_completions', timeColumn: 'completed_at' },
}

function applyFilters(q: any, filters: CountSpec['filters'] | undefined): any {
  let out = q
  for (const filter of filters ?? []) {
    if (filter.kind === 'eq') {
      out = out.eq(filter.col, filter.val)
    } else {
      out = out.in(filter.col, filter.vals)
    }
  }
  return out
}

export async function countRange(
  client: typeof supabaseAdmin,
  spec: CountSpec,
  sinceIso: string,
  untilIso: string,
): Promise<number | null> {
  let q: any = client.from(spec.table).select('*', { count: 'exact', head: true })
  q = applyFilters(q, spec.filters)
  q = q.gte(spec.timeColumn, sinceIso).lt(spec.timeColumn, untilIso)
  const { count, error } = await q
  if (error) {
    throw new Error(error.message)
  }
  return count ?? null
}

export async function readCounts(
  client: typeof supabaseAdmin,
  window: CountWindow,
): Promise<RangeCounts> {
  const [visits, signups, podcastStarts, progressions] = await Promise.all([
    countRange(client, CITADELLE_COUNT_SPECS.visits, window.sinceIso, window.untilIso),
    countRange(client, CITADELLE_COUNT_SPECS.signups, window.sinceIso, window.untilIso),
    countRange(client, CITADELLE_COUNT_SPECS.podcastStarts, window.sinceIso, window.untilIso),
    countRange(client, CITADELLE_COUNT_SPECS.progressions, window.sinceIso, window.untilIso),
  ])
  return { visits, signups, podcastStarts, progressions }
}

export function zeroCounts(): RangeCounts {
  return { visits: 0, signups: 0, podcastStarts: 0, progressions: 0 }
}

export function nullCounts(): RangeCounts {
  return { visits: null, signups: null, podcastStarts: null, progressions: null }
}

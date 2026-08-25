import { beforeEach, describe, expect, it, vi } from 'vitest'

const select = vi.fn()
const eq = vi.fn()
const order = vi.fn()
const insert = vi.fn()
const update = vi.fn()
const maybeSingle = vi.fn()
const limit = vi.fn()
const neq = vi.fn()
const from = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from },
}))

import {
  createEditorialRecommendation,
  listEditorialRecommendations,
  toEditorialRecommendationRecord,
} from '../store'

function buildQuery(result: unknown) {
  const query: any = {}
  query.select = select.mockImplementation(() => query)
  query.eq = eq.mockImplementation(() => query)
  query.in = vi.fn(() => query)
  query.is = vi.fn(() => query)
  query.gte = vi.fn(() => query)
  query.lte = vi.fn(() => query)
  query.order = order.mockImplementation(() => query)
  query.insert = insert.mockImplementation(() => query)
  query.update = update.mockImplementation(() => query)
  query.maybeSingle = maybeSingle.mockImplementation(async () => result)
  query.limit = limit.mockImplementation(() => query)
  query.neq = neq.mockImplementation(() => query)
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return query
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('editorial store', () => {
  it('maps recommendation rows into canonical records', () => {
    const record = toEditorialRecommendationRecord({
      id: 'rec_01',
      organization_id: 'org_01',
      recommendation_kind: 'REPURPOSE',
      content_kind: 'article',
      target_channel: 'whatsapp',
      status: 'PROPOSED',
      priority_band: 'NORMALE',
      window_start: '2026-08-25',
      window_end: '2026-08-31',
      scheduled_for: null,
      batch_id: 'batch_01',
      parent_recommendation_id: null,
      dedupe_key: 'dedupe',
      source_content_id: 'source_01',
      source_content_type: 'live',
      source_title: 'Teaching from Sunday',
      source_snapshot_jsonb: { title: 'Teaching from Sunday' },
      signals_jsonb: [
        {
          key: 'podcast',
          source: 'podcast',
          truthState: 'REAL',
          available: true,
          observedAt: '2026-08-25T09:00:00.000Z',
          value: { listens: 18 },
        },
      ],
      why_jsonb: ['reuse-first'],
      human_title_override: null,
      human_notes: null,
      human_edit_jsonb: {},
      generated_at: '2026-08-25T10:00:00.000Z',
      last_refreshed_at: null,
      last_human_action_at: null,
      accepted_at: null,
      scheduled_at: null,
      completed_at: null,
      rejected_at: null,
      archived_at: null,
      performance_snapshot_jsonb: {},
      created_by: 'user_01',
      updated_by: 'user_02',
      created_at: '2026-08-25T10:00:00.000Z',
      updated_at: '2026-08-25T10:00:00.000Z',
    })

    expect(record.organizationId).toBe('org_01')
    expect(record.targetChannel).toBe('whatsapp')
    expect(record.createdBy).toBe('user_01')
    expect(record.updatedBy).toBe('user_02')
  })

  it('creates a recommendation with a stable dedupe key', async () => {
    const row = {
      id: 'rec_01',
      organization_id: 'org_01',
      recommendation_kind: 'REPURPOSE',
      content_kind: 'article',
      target_channel: 'whatsapp',
      status: 'PROPOSED',
      priority_band: 'NORMALE',
      window_start: '2026-08-25',
      window_end: '2026-08-31',
      scheduled_for: null,
      batch_id: 'batch_01',
      parent_recommendation_id: null,
      dedupe_key: 'org_01|REPURPOSE|article|whatsapp|2026-08-25|2026-08-31|2026-08-28|source_01',
      source_content_id: 'source_01',
      source_content_type: 'live',
      source_title: 'Teaching from Sunday',
      source_snapshot_jsonb: {},
      signals_jsonb: [],
      why_jsonb: [],
      human_title_override: null,
      human_notes: null,
      human_edit_jsonb: {},
      generated_at: '2026-08-25T10:00:00.000Z',
      last_refreshed_at: null,
      last_human_action_at: null,
      accepted_at: null,
      scheduled_at: null,
      completed_at: null,
      rejected_at: null,
      archived_at: null,
      performance_snapshot_jsonb: {},
      created_by: 'user_01',
      updated_by: 'user_01',
      created_at: '2026-08-25T10:00:00.000Z',
      updated_at: '2026-08-25T10:00:00.000Z',
    }

    const query = buildQuery(row)
    from.mockReturnValue(query)

    const created = await createEditorialRecommendation({
      organizationId: 'org_01',
      recommendationKind: 'REPURPOSE',
      contentKind: 'article',
      targetChannel: 'whatsapp',
      status: 'PROPOSED',
      priorityBand: 'NORMALE',
      windowStart: '2026-08-25',
      windowEnd: '2026-08-31',
      scheduledFor: '2026-08-28',
      batchId: 'batch_01',
      parentRecommendationId: null,
      sourceContentId: 'source_01',
      sourceContentType: 'live',
      sourceTitle: 'Teaching from Sunday',
      sourceSnapshot: {},
      signals: [],
      why: [],
      humanTitleOverride: null,
      humanNotes: null,
      humanEdit: {},
      generatedAt: '2026-08-25T10:00:00.000Z',
      createdBy: 'user_01',
      updatedBy: 'user_01',
      dedupeKey: undefined,
    })

    expect(created.dedupeKey).toBe(row.dedupe_key)
    expect(insert).toHaveBeenCalled()
    expect(query.maybeSingle).toHaveBeenCalled()
  })
})

import { describe, expect, it } from 'vitest'
import { parseEditorialResponse } from '@/lib/intelligence/editorial/response-parser'
import { buildEditorialWorkspaceReadModel } from '@/lib/intelligence/editorial/workspace-planning'
import { buildEditorialWorkspaceSummary } from './page'

it('returns a French error for an empty refresh response', async () => {
  await expect(parseEditorialResponse(new Response('', { status: 500 }))).rejects.toThrow('Actualisation éditoriale impossible.')
})

describe('editorial intelligence page summary', () => {
  it('uses canonical opportunities for the total and watchlist rather than historical duplicates', () => {
    const base = {
      organizationId: 'org_01',
      recommendationKind: 'REPURPOSE' as const,
      contentKind: 'article',
      targetChannel: 'web',
      sourceContentId: 'source_01',
      status: 'PROPOSED' as const,
    }
    const workspace = buildEditorialWorkspaceReadModel([
      { ...base, id: 'old-watchlist', priorityBand: 'A_SURVEILLER' as const, generatedAt: '2026-08-26T10:00:00.000Z' },
      { ...base, id: 'current-watchlist', priorityBand: 'A_SURVEILLER' as const, generatedAt: '2026-08-27T10:00:00.000Z' },
      { ...base, id: 'old-strong', priorityBand: 'FORTE' as const, sourceContentId: 'source_02', generatedAt: '2026-08-26T10:00:00.000Z' },
      { ...base, id: 'current-strong', priorityBand: 'FORTE' as const, sourceContentId: 'source_02', generatedAt: '2026-08-27T10:00:00.000Z' },
    ], { weeklyCapacity: { weeklyTotal: 10 } }, new Date('2026-08-27T12:00:00.000Z'))

    const summary = buildEditorialWorkspaceSummary(workspace)

    expect(workspace.opportunities.map((item) => item.id)).toEqual(['current-watchlist', 'current-strong'])
    expect(summary.totalOpportunities).toBe(2)
    expect(summary.watchlist.map((item) => item.id)).toEqual(['current-watchlist'])
  })
})

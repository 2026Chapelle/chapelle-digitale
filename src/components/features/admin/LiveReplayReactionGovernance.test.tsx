import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  buildReplayReactionGovernancePatch,
  buildReplayReactionScopeOptions,
  replaceReplayReactionLive,
  type ReplayReactionGovernanceLive,
} from './LiveReplayReactionGovernance'

const componentSource = readFileSync(
  'src/components/features/admin/LiveReplayReactionGovernance.tsx',
  'utf8',
)

const pageSource = readFileSync(
  'src/app/(admin)/admin/lives/page.tsx',
  'utf8',
)

const confirmed: ReplayReactionGovernanceLive = {
  cmsLiveId: '22222222-2222-4222-8222-222222222222',
  title: 'Culte royal',
  status: 'published',
  organizationId: '11111111-1111-4111-8111-111111111111',
  organizationUnitId: '33333333-3333-4333-8333-333333333333',
  enabled: true,
}

describe('LIVE 4C replay reaction governance UI', () => {
  it('exposes the approved administration labels', () => {
    expect(componentSource).toContain('Réactions des replays')
    expect(componentSource).toContain('Réactions actives')
    expect(componentSource).toContain('Portée du replay')
  })

  it('consumes only the secured replay reaction administration endpoint', () => {
    expect(componentSource).toContain('/api/admin/live/replay/reactions')
    expect(componentSource).not.toContain('/api/admin/cms/lives')
  })

  it('offers only units returned by the secured GET', () => {
    const options = buildReplayReactionScopeOptions([
      { id: 'unit-a', name: 'Abidjan', unitType: 'national', parentId: null },
      { id: 'unit-b', name: 'Cocody', unitType: 'local_church', parentId: 'unit-a' },
    ], false)

    expect(options).toEqual([
      { value: 'unit-a', label: 'Abidjan' },
      { value: 'unit-b', label: 'Cocody' },
    ])
  })

  it('offers global only when the server grants global management', () => {
    const units = [
      { id: 'unit-a', name: 'Abidjan', unitType: 'national', parentId: null },
    ]

    expect(buildReplayReactionScopeOptions(units, false))
      .not.toContainEqual({ value: 'global', label: 'Global' })
    expect(buildReplayReactionScopeOptions(units, true)[0])
      .toEqual({ value: 'global', label: 'Global' })
  })

  it('restores the confirmed replay after an optimistic state fails', () => {
    const optimistic = { ...confirmed, enabled: false }
    const optimisticLives = replaceReplayReactionLive([confirmed], optimistic)
    const restoredLives = replaceReplayReactionLive(optimisticLives, confirmed)

    expect(optimisticLives[0].enabled).toBe(false)
    expect(restoredLives).toEqual([confirmed])
  })

  it('builds the exact four-key PATCH contract', () => {
    expect(buildReplayReactionGovernancePatch(confirmed)).toEqual({
      cmsLiveId: confirmed.cmsLiveId,
      enabled: true,
      organizationId: confirmed.organizationId,
      organizationUnitId: confirmed.organizationUnitId,
    })
  })

  it('does not expose reaction count editing', () => {
    expect(componentSource).not.toMatch(/modifier les compteurs/i)
    expect(componentSource).not.toMatch(/counter[_ -]?edit/i)
  })

  it('mounts the panel without replacing the generic live manager', () => {
    expect(pageSource).toContain("import { CmsManager }")
    expect(pageSource).toContain("import { LiveReplayReactionGovernance }")
    expect(pageSource).toContain('<CmsManager')
    expect(pageSource).toContain('<LiveReplayReactionGovernance />')
  })
})

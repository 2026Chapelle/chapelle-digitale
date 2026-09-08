import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const dashboard = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/page.tsx'),
  'utf8',
)

const formationsRoute = readFileSync(
  resolve(process.cwd(), 'src/app/api/member/formations/route.ts'),
  'utf8',
)

describe('member dashboard CONTINUER contract', () => {
  it('reuses the existing formations request and its recency ordering', () => {
    const formationFetches =
      dashboard.match(/fetch\('\/api\/member\/formations'/g) ?? []

    expect(formationFetches).toHaveLength(1)

    expect(formationsRoute).toContain(
      ".order('dernier_acces', { ascending: false, nullsFirst: false })",
    )

    expect(dashboard).toContain('continueFormation')
  })

  it('selects only a formation already started and not completed', () => {
    expect(dashboard).toContain('item.progression > 0')
    expect(dashboard).toContain('item.progression < 100')
    expect(dashboard).toContain('continueFormation')
  })

  it('renders a compact CONTINUER surface only when something can be resumed', () => {
    expect(dashboard).toContain('CONTINUER')
    expect(dashboard).toContain('{continueFormation && (')
    expect(dashboard).toContain('continueFormation.titre')
    expect(dashboard).toContain('continueFormation.progression')
    expect(dashboard).toContain('continueFormation.slug')
  })

  it('does not replace the independent MON PROCHAIN PAS contract', () => {
    expect(dashboard).toContain('MON PROCHAIN PAS')
    expect(dashboard).toContain('nextAction.href')
  })
})
import { describe, expect, it } from 'vitest'
import { selectTodayPrimary } from './contextual'

describe('Today editorial priority', () => {
  const items = [
    { kind: 'integration' as const, title: 'Maison', href: '/formations/je-decouvre-la-maison' },
    { kind: 'salvation' as const, title: 'Salut', href: '/formations/nouveau-croyant' },
    { kind: 'visitor' as const, title: 'Visiteur', href: '/formations/visiteur' },
  ]
  it('selects visitor before salvation and integration', () => expect(selectTodayPrimary(items)?.kind).toBe('visitor'))
  it('falls back to salvation then integration', () => {
    expect(selectTodayPrimary(items.filter(i => i.kind !== 'visitor'))?.kind).toBe('salvation')
    expect(selectTodayPrimary(items.filter(i => i.kind === 'integration'))?.kind).toBe('integration')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { selectUpcomingLives } from './upcoming-lives'

const NOW = Date.parse('2026-11-15T12:00:00Z')

describe('selectUpcomingLives', () => {
  it('keeps only future scheduled rows, sorted ascending', () => {
    const rows = [
      { id: 'late', status: 'scheduled', scheduled_at: '2026-12-01T18:00:00Z' },
      { id: 'past', status: 'scheduled', scheduled_at: '2026-11-01T18:00:00Z' },
      { id: 'soon', status: 'scheduled', scheduled_at: '2026-11-16T09:00:00Z' },
      { id: 'live', status: 'live', scheduled_at: '2026-11-20T18:00:00Z' },
      { id: 'ended', status: 'ended', scheduled_at: '2026-11-20T18:00:00Z' },
    ]
    expect(selectUpcomingLives(rows, NOW).map((r) => r.id)).toEqual(['soon', 'late'])
  })

  it('drops scheduled rows without a valid date or exactly at now', () => {
    const rows = [
      { id: 'null', status: 'scheduled', scheduled_at: null },
      { id: 'missing', status: 'scheduled' },
      { id: 'empty', status: 'scheduled', scheduled_at: '' },
      { id: 'garbage', status: 'scheduled', scheduled_at: 'pas une date' },
      { id: 'now', status: 'scheduled', scheduled_at: new Date(NOW).toISOString() },
    ]
    expect(selectUpcomingLives(rows, NOW)).toEqual([])
  })

  it('tolerates null/undefined input and does not mutate rows', () => {
    expect(selectUpcomingLives(null, NOW)).toEqual([])
    expect(selectUpcomingLives(undefined, NOW)).toEqual([])
    const rows = [
      { status: 'scheduled', scheduled_at: '2026-12-01T00:00:00Z' },
      { status: 'scheduled', scheduled_at: '2026-11-20T00:00:00Z' },
    ]
    const copy = JSON.parse(JSON.stringify(rows))
    selectUpcomingLives(rows, NOW)
    expect(rows).toEqual(copy)
  })
})

describe('member lives page — "À venir" source contract', () => {
  const page = readFileSync(
    resolve(process.cwd(), 'src/app/(member)/member/dashboard/lives/page.tsx'),
    'utf8',
  )

  it('builds the upcoming list through selectUpcomingLives', () => {
    expect(page).toMatch(/import \{ selectUpcomingLives \} from '@\/lib\/live\/upcoming-lives'/)
    expect(page).toMatch(/setAVenir\(selectUpcomingLives\(data\)/)
  })

  it('no longer filters upcoming lives on status alone', () => {
    expect(page).not.toMatch(/setAVenir\(data\.filter\(/)
  })
})

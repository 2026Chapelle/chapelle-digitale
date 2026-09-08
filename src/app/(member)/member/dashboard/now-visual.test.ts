import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/(member)/member/dashboard/page.tsx'),
  'utf8',
)

describe('member dashboard MAINTENANT visual contract', () => {
  it('shows an explicit active-live surface when the canonical state is LIVE', () => {
    expect(source).toContain("liveState.status === 'LIVE'")
    expect(source).toContain('EN DIRECT MAINTENANT')
    expect(source).toContain('REJOINDRE LE DIRECT')
    expect(source).toContain('liveState.title')
  })

  it('shows a distinct upcoming surface when the canonical state is UPCOMING', () => {
    expect(source).toContain("liveState.status === 'UPCOMING'")
    expect(source).toContain('PROCHAIN RENDEZ-VOUS')
    expect(source).toContain('liveState.scheduledAt')
  })

  it('keeps OFFLINE visually quiet while preserving MON PROCHAIN PAS', () => {
    expect(source).not.toContain('Aucun direct en cours')
    expect(source).not.toContain('Aucun live en cours')
    expect(source).toContain('MON PROCHAIN PAS')
    expect(source).toContain('nextAction.href')
  })
})
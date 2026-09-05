import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/app/(member)/member/dashboard/page.tsx'), 'utf8')

describe('member dashboard hero next action source guard', () => {
  it('uses the next-action resolver and presents one primary next-action CTA', () => {
    expect(source).toContain("from '@/lib/member-home/next-action'")
    expect(source).toContain('MON PROCHAIN PAS')
    expect(source).toContain('nextAction.href')
    expect(source).not.toContain('> Rejoindre le Live</Link>')
  })

  it('keeps the existing lower dashboard sections', () => {
    expect(source).toContain('Verset du Jour')
    expect(source).toContain('Mes Formations')
    expect(source).toContain('<ProgressionCard />')
    expect(source).toContain('Badges à débloquer')
  })
})

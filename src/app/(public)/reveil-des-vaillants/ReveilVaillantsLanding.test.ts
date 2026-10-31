import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(
  resolve(process.cwd(), 'src/app/(public)/reveil-des-vaillants/ReveilVaillantsLanding.tsx'),
  'utf8',
)

describe('ReveilVaillantsLanding', () => {
  it('uses a browser-visible demo flag and a deterministic initial campaign fallback', () => {
    const supabaseSource = readFileSync(resolve(process.cwd(), 'src/lib/supabase.ts'), 'utf8')

    expect(supabaseSource).toContain('NEXT_PUBLIC_CITADELLE_DEMO_MODE')
    expect(source).toContain('useState(true)')
    expect(source).not.toMatch(/const displayCulte\s*=[\s\S]*Date\.now/)
  })
})

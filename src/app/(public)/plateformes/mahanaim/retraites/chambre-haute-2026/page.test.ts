import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8')

describe('Chambre Haute 2026 public page', () => {
  it('places the official poster between the hero and the three pillars', () => {
    expect(pageSource).toContain("import Image from 'next/image'")
    expect(pageSource).toContain(
      'src="/images/mahanaim/chambre-haute-2026-affiche.png"',
    )
    expect(pageSource).toContain(
      'alt="Affiche officielle des 10 Jours dans la Chambre Haute — Revêtus de Puissance — Mahanaïm"',
    )
    expect(pageSource).toContain('object-contain')
    expect(pageSource).toContain(
      'sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"',
    )
    expect(pageSource).toContain(
      '10–19 octobre 2026 · Clôture le 20 octobre',
    )
    expect(pageSource).toContain(
      '10 jours de retraite · 10–19 octobre · Clôture le 20 octobre 2026',
    )

    const posterIndex = pageSource.indexOf('L’AFFICHE OFFICIELLE')
    const pillarsIndex = pageSource.indexOf("title: 'Se consacrer'")

    expect(posterIndex).toBeGreaterThan(0)
    expect(posterIndex).toBeLessThan(pillarsIndex)
  })
})

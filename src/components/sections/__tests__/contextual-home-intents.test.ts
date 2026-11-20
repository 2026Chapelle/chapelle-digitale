import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/components/sections/ContextualHome.tsx'), 'utf8')
const start = source.indexOf('<section id="intentions"')
const end = source.indexOf('</section>', start)
const section = source.slice(start, end)
const grid = section.slice(section.indexOf('INTENTS.map'), section.indexOf('</div>', section.indexOf('INTENTS.map')))

describe('ContextualHome — cartes « De quoi as-tu besoin aujourd’hui ? »', () => {
  it('chaque carte est un lien de navigation, plus un bouton inerte', () => {
    expect(start).toBeGreaterThan(-1)
    expect(grid).toContain('<Link')
    expect(grid).toMatch(/const href = resolveIntentHref\(item\.id, \{ authenticated, memberNextAction, liveState \}\)/)
    expect(grid).toContain('href={href}')
    expect(grid).not.toContain('<button')
    expect(grid).not.toContain('setIntent(')
  })

  it('toute la surface de la carte est cliquable (lien bloc englobant titre et description)', () => {
    const link = grid.slice(grid.indexOf('<Link'), grid.indexOf('</Link>'))
    expect(link).toMatch(/className="[^"]*\bblock\b/)
    expect(link).toContain('{item.title}')
    expect(link).toContain('{item.description}')
  })

  it('accessibilité : focus clavier visible et nom accessible complet', () => {
    expect(grid).toMatch(/focus-visible:ring-2/)
    expect(grid).toMatch(/focus-visible:outline-none/)
    expect(grid).toMatch(/aria-label=\{`\$\{item\.title\}/)
  })

  it('design premium préservé : mêmes classes visuelles qu’avant', () => {
    for (const cls of ['home-motion-card', 'text-left', 'p-5', 'rounded-2xl', 'border', 'border-white/10', 'bg-white/[.03]', 'font-cinzel text-white font-bold', 'block font-inter text-xs text-white/45 mt-2']) {
      expect(grid).toContain(cls)
    }
    expect(section).toContain('grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8')
  })

  it('suivi analytique conservé (intention + destination)', () => {
    expect(grid).toMatch(/track\('home_intent_selected', \{ intent: item\.id, href \}\)/)
  })
})

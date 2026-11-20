import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()
const homeSections = readFileSync(resolve(root, 'src/components/sections/HomeSections.tsx'), 'utf8')

describe('Accueil — section « Emporte Citadelle avec toi » (installation)', () => {
  it('HomeSections importe le composant d’installation existant', () => {
    expect(homeSections).toContain("import { InstallCitadelleSection } from '@/components/home/InstallCitadelleSection'")
  })

  it('la section est rendue une seule fois, immédiatement après ContextualHome (bas de l’accueil, avant le footer)', () => {
    expect(homeSections.match(/<InstallCitadelleSection \/>/g) ?? []).toHaveLength(1)
    expect(homeSections).toMatch(/<ContextualHome liveState=\{liveState\} featuredEvent=\{featuredEvent\} \/>\s*<InstallCitadelleSection \/>/)
  })

  it('réutilise le composant et le mécanisme PWA existants (aucun second système d’installation)', () => {
    const files: string[] = []
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(f) && !/\.test\./.test(f)) files.push(p) } }
    walk(resolve(root, 'src'))
    const capture = files.filter((f) => readFileSync(f, 'utf8').includes("addEventListener('beforeinstallprompt'"))
    expect(capture.map((f) => f.slice(root.length + 1))).toEqual(['src/components/home/pwa-install.ts'])
    const registers = files.filter((f) => /serviceWorker\s*\.\s*register/.test(readFileSync(f, 'utf8')))
    expect(registers).toEqual([])
  })

  it('le composant garde son bouton « Installer Citadelle » et l’aide manuelle iPhone / Android / ordinateur', () => {
    const c = readFileSync(resolve(root, 'src/components/home/InstallCitadelleSection.tsx'), 'utf8')
    expect(c).toContain('Installer Citadelle')
    expect(c).toContain('usePwaInstall')
    expect(c).toMatch(/iPhone\|iPad\|iPod/)
    expect(c).toMatch(/Android/)
    expect(c).toContain('id="install-citadelle-title"')
  })
})

describe('pwa-install — capture de l’invite d’installation', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

  it('intercepte beforeinstallprompt (preventDefault) pour le rejouer depuis le bouton', async () => {
    const target = new EventTarget()
    vi.stubGlobal('window', target)
    await import('@/components/home/pwa-install')
    const ev = new Event('beforeinstallprompt', { cancelable: true })
    target.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('détecte le mode application installée (standalone) sur ordinateur/Android et sur iPhone', async () => {
    const mk = (standaloneMedia: boolean, iosStandalone?: boolean) => Object.assign(new EventTarget(), {
      matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' && standaloneMedia }),
      navigator: { standalone: iosStandalone },
    })
    vi.stubGlobal('window', mk(false))
    let mod = await import('@/components/home/pwa-install')
    expect(mod.isStandalone()).toBe(false)
    vi.resetModules(); vi.stubGlobal('window', mk(true))
    mod = await import('@/components/home/pwa-install')
    expect(mod.isStandalone()).toBe(true)
    vi.resetModules(); vi.stubGlobal('window', mk(false, true))
    mod = await import('@/components/home/pwa-install')
    expect(mod.isStandalone()).toBe(true)
  })
})

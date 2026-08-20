import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou STATIQUE (remplace un ancien test tautologique).
 * Prouve que la fondation Intelligence est pure & secretless : le code source
 * (hors tests) ne lit aucun secret, ne fait aucun I/O réseau, et n'utilise
 * aucune horloge/aléa implicite (déterminisme). On strippe les commentaires
 * pour ne pas déclencher de faux positifs sur la documentation.
 */

const here = dirname(fileURLToPath(import.meta.url))
// core/__tests__ -> core -> intelligence
const INTEL_ROOT = join(here, '..', '..')

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '') // blocs /* ... */
    .replace(/(^|[^:])\/\/.*$/gm, '$1') // lignes // ... (évite les :// d'URL)
}

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === 'data-model') continue
      collectSourceFiles(full, acc)
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      acc.push(full)
    }
  }
  return acc
}

const FORBIDDEN: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: 'process.env (secret/env)', re: /process\.env/ },
  { label: 'fetch( (réseau)', re: /\bfetch\s*\(/ },
  { label: 'new Date( (horloge implicite)', re: /\bnew\s+Date\s*\(/ },
  { label: 'Date.now( (horloge implicite)', re: /\bDate\.now\s*\(/ },
  { label: 'Math.random( (non déterministe)', re: /\bMath\.random\s*\(/ },
  { label: "import @supabase (client DB)", re: /from\s+['"]@supabase/ },
  { label: 'createClient (client DB)', re: /createClient\s*\(/ },
]

describe('pureté & secretless de la fondation (scan statique)', () => {
  const files = collectSourceFiles(INTEL_ROOT)

  it('trouve bien les fichiers source à scanner', () => {
    expect(files.length).toBeGreaterThan(8)
  })

  it('aucun fichier source ne viole les invariants de pureté', () => {
    const violations: string[] = []
    for (const file of files) {
      const code = stripComments(readFileSync(file, 'utf8'))
      for (const rule of FORBIDDEN) {
        if (rule.re.test(code)) {
          violations.push(`${file.replace(INTEL_ROOT, '…')} → ${rule.label}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Garde-fou STATIQUE (remplace un ancien test tautologique).
 * Prouve que la fondation Intelligence reste pure & secretless : le CŒUR
 * analytique (types, core, metrics, adapters, libs SEO pures) ne lit aucun
 * secret, ne fait aucun I/O réseau, et n'utilise aucune horloge/aléa implicite.
 * On strippe les commentaires pour éviter les faux positifs de documentation.
 *
 * Deux catégories de règles :
 *  - PURE_ONLY  : env(secret)/réseau/horloge implicite → interdits dans le cœur pur,
 *    MAIS tolérés dans les adaptateurs SERVEUR qui se déclarent `import 'server-only'`
 *    (connecteurs Google réels : secrets server-side, appels REST, fallback horloge).
 *    Ces fichiers sont couverts par d'autres garanties (server-only ⇒ jamais bundlés
 *    côté client, tests dédiés « aucune fuite de secret »).
 *  - ALWAYS     : aucun client DB, aucun aléa non déterministe — partout, y compris
 *    dans les adaptateurs serveur (la couche Intelligence n'introduit ni Math.random
 *    ni client Supabase).
 *
 * Précisions par rapport à la version Phase 0 :
 *  - horloge implicite = `new Date()` / `Date.now()` SANS argument. `new Date(ms)`
 *    (construction déterministe à partir d'un instant injecté) est autorisé.
 *  - env public `process.env.NEXT_PUBLIC_*` (non secret, inliné client) est autorisé ;
 *    seul l'accès à un env NON public est traité comme lecture de secret.
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

type Rule = { label: string; re: RegExp }

/** Interdits dans le cœur pur ; tolérés dans les fichiers `server-only`. */
const PURE_ONLY: ReadonlyArray<Rule> = [
  // Lecture d'un env NON public (secret). `process.env.NEXT_PUBLIC_*` est autorisé.
  { label: 'process.env non public (secret/env)', re: /process\.env(?!\s*\.\s*NEXT_PUBLIC_)/ },
  { label: 'fetch( (réseau)', re: /\bfetch\s*\(/ },
  { label: 'new Date() implicite (horloge)', re: /\bnew\s+Date\s*\(\s*\)/ },
  { label: 'Date.now( (horloge implicite)', re: /\bDate\.now\s*\(/ },
]

/** Interdits PARTOUT dans la couche Intelligence (y compris server-only). */
const ALWAYS: ReadonlyArray<Rule> = [
  { label: 'Math.random( (non déterministe)', re: /\bMath\.random\s*\(/ },
  { label: 'import @supabase (client DB)', re: /from\s+['"]@supabase/ },
  { label: 'createClient (client DB)', re: /createClient\s*\(/ },
]

/** Un fichier se déclarant server-only est un adaptateur serveur assumé. */
function isServerOnly(code: string): boolean {
  return /import\s+['"]server-only['"]/.test(code)
}

describe('pureté & secretless de la fondation (scan statique)', () => {
  const files = collectSourceFiles(INTEL_ROOT)

  it('trouve bien les fichiers source à scanner', () => {
    expect(files.length).toBeGreaterThan(8)
  })

  it('aucun fichier source ne viole les invariants de pureté', () => {
    const violations: string[] = []
    for (const file of files) {
      const code = stripComments(readFileSync(file, 'utf8'))
      const serverOnly = isServerOnly(code)
      const rules = serverOnly ? ALWAYS : [...PURE_ONLY, ...ALWAYS]
      for (const rule of rules) {
        if (rule.re.test(code)) {
          violations.push(`${file.replace(INTEL_ROOT, '…')} → ${rule.label}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('les adaptateurs serveur réels sont bien déclarés server-only', () => {
    // Garantit que l'exemption PURE_ONLY ne s'applique qu'à des fichiers qui
    // assument explicitement leur nature serveur (jamais bundlés côté client).
    const serverImpls = files.filter(
      (f) =>
        /connectors[\\/]google-(search-console|analytics)[\\/](index|client|config)\.ts$/.test(f) ||
        /connectors[\\/]google-auth\.ts$/.test(f),
    )
    const notDeclared = serverImpls.filter(
      (f) => !isServerOnly(stripComments(readFileSync(f, 'utf8'))),
    )
    expect(notDeclared).toEqual([])
  })
})

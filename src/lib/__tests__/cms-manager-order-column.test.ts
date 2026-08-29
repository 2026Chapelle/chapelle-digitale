import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function readOptional(path: string) {
  const absolute = resolve(process.cwd(), path)
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : ''
}

const cms = read('src/components/features/admin/CmsManager.tsx')
const formations = read('src/app/(admin)/admin/formations/page.tsx')
const modules = read('src/app/(admin)/admin/modules/page.tsx')
const parcours = read('src/app/(admin)/admin/parcours/page.tsx')
const lmsRoute = read('src/app/api/admin/lms/[resource]/route.ts')
const publicFormations = read('src/app/(public)/formations/page.tsx')

const migrationPath =
  'supabase/migrations/20260829060000_formations_canonical_order.sql'
const migration = readOptional(migrationPath)

describe('CmsManager configurable order column', () => {
  it('permet de désactiver ou choisir la colonne d’ordre', () => {
    expect(cms).toContain('orderColumn?: string | null')
    expect(cms).toContain("orderColumn = 'sort_order'")
  })

  it('attribue le prochain ordre sans collision', () => {
    expect(cms).toContain('function nextOrderValue()')
    expect(cms).toContain(
      'return existing.length ? Math.max(...existing) + 1 : 1'
    )
    expect(cms).toContain(
      'if (orderColumn) blank[orderColumn] = nextOrderValue()'
    )
    expect(cms).toContain(
      'if (orderColumn) copy[orderColumn] = nextOrderValue()'
    )
  })

  it('utilise dynamiquement la colonne configurée pour déplacer une ligne', () => {
    expect(cms).toContain('if (!orderColumn) return')
    expect(cms).toContain(
      '{ [orderColumn]: swap[orderColumn] ?? idx + dir }'
    )
    expect(cms).toContain(
      '{ [orderColumn]: row[orderColumn] ?? idx }'
    )
  })

  it('utilise ordre pour les formations', () => {
    expect(formations).toContain('orderColumn="ordre"')
  })

  it('utilise ordre pour les modules', () => {
    expect(modules).toContain('orderColumn="ordre"')
  })

  it('utilise ordre pour les parcours', () => {
    expect(parcours).toContain('orderColumn="ordre"')
  })
})

describe('Formations canonical order', () => {
  it('ordonne les formations du back-office par ordre', () => {
    expect(lmsRoute).toContain(
      "const orderCol = (r: string) => (r === 'certificats' ? 'delivre_le' : 'ordre')"
    )
  })

  it('ordonne la vitrine publique par ordre canonique', () => {
    expect(publicFormations).toContain(
      "statut, ordre')"
    )
    expect(publicFormations).toContain(
      ".order('ordre', { ascending: true, nullsFirst: false })"
    )
  })

  it('ajoute ordre et initialise la séquence canonique', () => {
    expect(migration).toContain(
      'add column if not exists ordre integer'
    )

    expect(migration).toContain(
      "('nouveau-croyant', 1)"
    )
    expect(migration).toContain(
      "('parcours-du-salut', 2)"
    )
    expect(migration).toContain(
      "('je-decouvre-la-maison', 3)"
    )
    expect(migration).toContain(
      "('je-stabilise-ma-foi', 4)"
    )
    expect(migration).toContain(
      "('je-deviens-disciple-actif', 5)"
    )

    expect(migration).toContain(
      'idx_formations_ordre'
    )
  })
})
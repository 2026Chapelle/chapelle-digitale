import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

const cms = read('src/components/features/admin/CmsManager.tsx')
const formations = read('src/app/(admin)/admin/formations/page.tsx')
const modules = read('src/app/(admin)/admin/modules/page.tsx')
const parcours = read('src/app/(admin)/admin/parcours/page.tsx')

describe('CmsManager configurable order column', () => {
  it('permet de désactiver ou choisir la colonne d’ordre', () => {
    expect(cms).toContain('orderColumn?: string | null')
    expect(cms).toContain("orderColumn = 'sort_order'")
    expect(cms).toContain('if (orderColumn) blank[orderColumn] = rows.length')
    expect(cms).toContain('if (orderColumn) copy[orderColumn] = rows.length')
  })

  it('utilise dynamiquement la colonne configurée pour déplacer une ligne', () => {
    expect(cms).toContain('if (!orderColumn) return')
    expect(cms).toContain('{ [orderColumn]: swap[orderColumn] ?? idx + dir }')
    expect(cms).toContain('{ [orderColumn]: row[orderColumn] ?? idx }')
  })

  it('ne crée aucun sort_order pour formations', () => {
    expect(formations).toContain('orderColumn={null}')
  })

  it('utilise ordre pour les modules', () => {
    expect(modules).toContain('orderColumn="ordre"')
  })

  it('utilise ordre pour les parcours', () => {
    expect(parcours).toContain('orderColumn="ordre"')
  })
})
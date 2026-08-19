import { describe, it, expect } from 'vitest'
import {
  DOCUMENT_TYPES,
  ACCESS_LEVELS,
  LINK_TARGET_KINDS,
  TARGET_COLUMN,
  COLUMN_TARGET,
  toAccessLevel,
  toDocumentType,
  mapMediaRowToDocument,
  isVisibleInLibrary,
  resolveDocumentSource,
  documentReaderHref,
  slugify,
  normalizeUrl,
  isAllowedDocumentSource,
  buildDocumentLinkRow,
  countLinkTargets,
  validateLinkRow,
  extractTargets,
  type CmsMediaRow,
} from '../document-model'

const baseRow = (over: Partial<CmsMediaRow> = {}): CmsMediaRow => ({
  id: 'doc-1',
  type: 'pdf',
  title: 'Les 21 Déclarations',
  url: 'https://x.supabase.co/storage/v1/object/public/media/documents/abc.pdf',
  status: 'published',
  ...over,
})

describe('énumérations & mapping colonnes', () => {
  it('TARGET_COLUMN et COLUMN_TARGET sont inverses cohérents', () => {
    for (const kind of LINK_TARGET_KINDS) {
      expect(COLUMN_TARGET[TARGET_COLUMN[kind]]).toBe(kind)
    }
    expect(TARGET_COLUMN.parcours).toBe('parcours_id')
    expect(TARGET_COLUMN.academy_lesson).toBe('academy_lesson_id')
  })
  it('toAccessLevel / toDocumentType sont fail-safe', () => {
    expect(toAccessLevel('premium')).toBe('premium')
    expect(toAccessLevel('n-importe-quoi')).toBe('public')
    expect(toAccessLevel(undefined)).toBe('public')
    expect(toDocumentType('manuel')).toBe('manuel')
    expect(toDocumentType('xxx')).toBeNull()
    expect(ACCESS_LEVELS).toContain('member')
    expect(DOCUMENT_TYPES).toContain('declaration')
  })
})

describe('mapMediaRowToDocument', () => {
  it('projette les colonnes + valeurs par défaut sûres', () => {
    const d = mapMediaRowToDocument(baseRow({ document_type: 'declaration', access_level: 'member', page_count: 21, thumbnail_url: 'c.jpg' }))
    expect(d.documentType).toBe('declaration')
    expect(d.accessLevel).toBe('member')
    expect(d.pageCount).toBe(21)
    expect(d.coverUrl).toBe('c.jpg')
    expect(d.visibleInLibrary).toBe(true) // défaut
  })
  it('repli author → platform ; access invalide → public', () => {
    const d = mapMediaRowToDocument(baseRow({ platform: 'Citadelle', access_level: 'bogus' }))
    expect(d.author).toBe('Citadelle')
    expect(d.accessLevel).toBe('public')
  })
  it('visible_in_library=false respecté', () => {
    const d = mapMediaRowToDocument(baseRow({ visible_in_library: false }))
    expect(d.visibleInLibrary).toBe(false)
  })
})

describe('bibliothèque (vue du registre)', () => {
  it('document bibliothèque uniquement : publié + visible', () => {
    const d = mapMediaRowToDocument(baseRow())
    expect(isVisibleInLibrary(d)).toBe(true)
  })
  it('document destination uniquement : masqué de la bibliothèque', () => {
    const d = mapMediaRowToDocument(baseRow({ visible_in_library: false }))
    expect(isVisibleInLibrary(d)).toBe(false)
  })
  it('brouillon jamais en bibliothèque', () => {
    const d = mapMediaRowToDocument(baseRow({ status: 'draft' }))
    expect(isVisibleInLibrary(d)).toBe(false)
  })
})

describe('résolution de source (canonique vs legacy) + identité lecteur', () => {
  it('privilégie l\'URL canonique du document', () => {
    const d = mapMediaRowToDocument(baseRow({ url: 'https://x.supabase.co/canon.pdf' }))
    expect(resolveDocumentSource(d, 'https://legacy/old.pdf')).toBe('https://x.supabase.co/canon.pdf')
  })
  it('legacy pdf_url toujours fonctionnel en repli', () => {
    expect(resolveDocumentSource(null, 'https://legacy/old.pdf')).toBe('https://legacy/old.pdf')
    expect(resolveDocumentSource({ url: '' }, 'https://legacy/old.pdf')).toBe('https://legacy/old.pdf')
    expect(resolveDocumentSource(null, null)).toBeNull()
  })
  it('documentId ouvre le lecteur via /lecture/pdf/[id]', () => {
    expect(documentReaderHref({ id: 'abc-123' })).toBe('/lecture/pdf/abc-123')
  })
})

describe('slugify / normalizeUrl / isAllowedDocumentSource', () => {
  it('slugify enlève accents & caractères, borne la longueur', () => {
    expect(slugify('La grâce royale m\'a localisé')).toBe('la-grace-royale-m-a-localise')
    expect(slugify('   ')).toBe('document')
    expect(slugify('A'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
  it('normalizeUrl retire query/fragment et baisse la casse du host', () => {
    expect(normalizeUrl('https://X.Supabase.CO/media/a.pdf?token=1#p2')).toBe('https://x.supabase.co/media/a.pdf')
  })
  it('isAllowedDocumentSource : same-origin ou *.supabase.co, sinon refus', () => {
    expect(isAllowedDocumentSource('/media/a.pdf', 'https://app.test')).toBe('https://app.test/media/a.pdf')
    expect(isAllowedDocumentSource('https://y.supabase.co/a.pdf', 'https://app.test')).toBe('https://y.supabase.co/a.pdf')
    expect(isAllowedDocumentSource('https://evil.com/a.pdf', 'https://app.test')).toBeNull()
    expect(isAllowedDocumentSource('javascript:alert(1)', 'https://app.test')).toBeNull()
  })
})

describe('rattachements multi-destination', () => {
  it('1 document → 1 destination : ligne valide, une seule cible', () => {
    const row = buildDocumentLinkRow({ documentId: 'doc-1', target: { kind: 'parcours', id: 'p-1' } })
    expect(row.document_id).toBe('doc-1')
    expect(row.parcours_id).toBe('p-1')
    expect(row.role).toBe('attachment')
    expect(countLinkTargets(row)).toBe(1)
    expect(validateLinkRow(row).ok).toBe(true)
  })
  it('1 document → plusieurs destinations : N lignes, cibles extraites', () => {
    const rows = [
      buildDocumentLinkRow({ documentId: 'doc-1', target: { kind: 'parcours', id: 'p-1' } }),
      buildDocumentLinkRow({ documentId: 'doc-1', target: { kind: 'formation', id: 'f-1' } }),
      buildDocumentLinkRow({ documentId: 'doc-1', target: { kind: 'teaching', id: 't-1' } }),
    ]
    const targets = extractTargets(rows)
    expect(targets).toEqual([
      { kind: 'parcours', id: 'p-1' },
      { kind: 'formation', id: 'f-1' },
      { kind: 'teaching', id: 't-1' },
    ])
  })
  it('2 documents → même destination : deux lignes valides distinctes', () => {
    const a = buildDocumentLinkRow({ documentId: 'doc-1', target: { kind: 'event', id: 'e-1' } })
    const b = buildDocumentLinkRow({ documentId: 'doc-2', target: { kind: 'event', id: 'e-1' } })
    expect(validateLinkRow(a).ok).toBe(true)
    expect(validateLinkRow(b).ok).toBe(true)
    expect(a.document_id).not.toBe(b.document_id)
    expect(a.event_id).toBe(b.event_id)
  })
  it('document sans destination : aucune cible extraite', () => {
    expect(extractTargets([])).toEqual([])
  })
  it('lien sans cible → refusé', () => {
    const bad = { document_id: 'doc-1', role: 'attachment' }
    expect(countLinkTargets(bad)).toBe(0)
    expect(validateLinkRow(bad).ok).toBe(false)
  })
  it('lien à deux cibles → refusé (exactement une)', () => {
    const bad = { document_id: 'doc-1', parcours_id: 'p-1', formation_id: 'f-1' }
    expect(countLinkTargets(bad)).toBe(2)
    expect(validateLinkRow(bad).ok).toBe(false)
  })
  it('lien sans document_id → refusé', () => {
    const bad = { parcours_id: 'p-1' }
    expect(validateLinkRow(bad).ok).toBe(false)
  })
  it('cible inconnue → erreur explicite', () => {
    expect(() => buildDocumentLinkRow({ documentId: 'd', target: { kind: 'nope' as any, id: 'x' } })).toThrow()
  })
})

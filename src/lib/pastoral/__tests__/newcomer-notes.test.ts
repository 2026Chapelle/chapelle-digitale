import { describe, it, expect } from 'vitest'
import { mergeAdminNote, normalizeAdminNote, ADMIN_NOTE_MAX } from '@/lib/pastoral/newcomer-notes'

const NOW = '2026-07-07T12:00:00.000Z'

describe('normalizeAdminNote', () => {
  it('trim, et vide pour blanc ou non-string', () => {
    expect(normalizeAdminNote('  Appelé  ')).toBe('Appelé')
    expect(normalizeAdminNote('   ')).toBe('')
    expect(normalizeAdminNote(null)).toBe('')
    expect(normalizeAdminNote(42)).toBe('')
  })
  it('borne la longueur à ADMIN_NOTE_MAX', () => {
    expect(normalizeAdminNote('x'.repeat(ADMIN_NOTE_MAX + 500)).length).toBe(ADMIN_NOTE_MAX)
  })
})

describe('mergeAdminNote', () => {
  it('préserve les clés existantes et ajoute admin_note + admin_note_at', () => {
    const meta = { foo: 'bar', nested: { a: 1 } }
    const { metadata, note } = mergeAdminNote(meta, '  Appelé le dimanche  ', NOW)
    expect(metadata.foo).toBe('bar')
    expect(metadata.nested).toEqual({ a: 1 })
    expect(metadata.admin_note).toBe('Appelé le dimanche')
    expect(metadata.admin_note_at).toBe(NOW)
    expect(note).toBe('Appelé le dimanche')
  })

  it('ne mute pas l’objet metadata source', () => {
    const meta = { foo: 'bar' }
    mergeAdminNote(meta, 'x', NOW)
    expect(meta).toEqual({ foo: 'bar' })
  })

  it('gère metadata null / invalide (array) en repartant de {}', () => {
    expect(mergeAdminNote(null, 'n', NOW).metadata).toEqual({ admin_note: 'n', admin_note_at: NOW })
    expect(mergeAdminNote(['x'] as unknown, 'n', NOW).metadata).toEqual({ admin_note: 'n', admin_note_at: NOW })
    expect(mergeAdminNote(undefined, 'n', NOW).metadata).toEqual({ admin_note: 'n', admin_note_at: NOW })
  })

  it('borne la longueur de la note écrite', () => {
    const { metadata } = mergeAdminNote({}, 'y'.repeat(ADMIN_NOTE_MAX + 100), NOW)
    expect((metadata.admin_note as string).length).toBe(ADMIN_NOTE_MAX)
  })

  it('rejette une note vide', () => {
    expect(() => mergeAdminNote({}, '   ', NOW)).toThrow()
    expect(() => mergeAdminNote({ foo: 1 }, '', NOW)).toThrow()
  })
})

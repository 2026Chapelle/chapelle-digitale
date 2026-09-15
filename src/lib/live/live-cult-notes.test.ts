import {
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest'

type Subject = Record<string, any>

let subject: Subject = {}

beforeAll(async () => {
  const modulePath =
    './live-cult-notes'

  subject =
    await import(
      /* @vite-ignore */
      modulePath
    ).catch(() => ({}))
})

describe('LIVE 4C cult notebook domain', () => {
  it('freezes the five V1 note kinds', () => {
    expect(
      subject.LIVE_CULT_NOTE_KINDS,
    ).toEqual([
      'note',
      'received_word',
      'scripture',
      'decision',
      'meditation',
    ])
  })

  it('rejects unknown kinds and defaults empty kind to note', () => {
    expect(
      typeof subject.normalizeLiveCultNoteKind,
    ).toBe('function')

    expect(
      subject.normalizeLiveCultNoteKind(
        undefined,
      ),
    ).toBe('note')

    expect(
      subject.normalizeLiveCultNoteKind(
        'bookmark',
      ),
    ).toBeNull()
  })

  it('trims body and enforces the SQL 1..10000 contract', () => {
    expect(
      typeof subject.normalizeLiveCultNoteBody,
    ).toBe('function')

    expect(
      subject.normalizeLiveCultNoteBody(
        '  parole  ',
      ),
    ).toBe('parole')

    expect(
      subject.normalizeLiveCultNoteBody(
        '   ',
      ),
    ).toBeNull()

    expect(
      subject.normalizeLiveCultNoteBody(
        'x'.repeat(10001),
      ),
    ).toBeNull()
  })

  it('normalizes optional scripture and non-negative timestamp', () => {
    expect(
      typeof subject.normalizeScriptureReference,
    ).toBe('function')

    expect(
      typeof subject.normalizePositionSeconds,
    ).toBe('function')

    expect(
      subject.normalizeScriptureReference(
        '  Jean 3:16  ',
      ),
    ).toBe('Jean 3:16')

    expect(
      subject.normalizeScriptureReference(
        '',
      ),
    ).toBeNull()

    expect(
      subject.normalizePositionSeconds(
        12.9,
      ),
    ).toBe(12)

    expect(
      subject.normalizePositionSeconds(
        -1,
      ),
    ).toBeNull()
  })

  it('accepts only UUIDs', () => {
    expect(
      typeof subject.validCultNoteUuid,
    ).toBe('function')

    expect(
      subject.validCultNoteUuid(
        '11111111-1111-4111-8111-111111111111',
      ),
    ).toBe(true)

    expect(
      subject.validCultNoteUuid(
        'not-a-uuid',
      ),
    ).toBe(false)
  })
})

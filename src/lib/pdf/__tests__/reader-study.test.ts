import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildAnchor, locateAnchor } from '@/lib/pdf/study-anchor'
import { mergeProgress, type ProgressRecord } from '@/lib/pdf/study-progress'

/** LB-2 — Citadelle Study : ancrage robuste, fusion de progression, garde RLS. */

describe('Ancrage robuste d’un passage', () => {
  const pageText =
    'Au commencement la Citadelle accueille les visiteurs. La Citadelle forme des disciples fidèles.'

  it('construit un ancrage avec contexte', () => {
    const start = pageText.indexOf('forme des disciples')
    const end = start + 'forme des disciples'.length
    const a = buildAnchor({ page: 3, pageText, startOffset: start, endOffset: end })
    expect(a).not.toBeNull()
    expect(a!.selectedText).toBe('forme des disciples')
    expect(a!.prefix.endsWith('Citadelle ')).toBe(true)
    expect(a!.page).toBe(3)
  })

  it('retrouve le passage même après un léger relayout (texte re-concaténé)', () => {
    const start = pageText.indexOf('forme des disciples')
    const a = buildAnchor({ page: 3, pageText, startOffset: start, endOffset: start + 19 })!
    // Couche texte ré-rendue avec des espaces différents autour :
    const relaidOut = 'Au  commencement la Citadelle accueille les visiteurs.  La Citadelle forme des disciples  fidèles.'
    const loc = locateAnchor(relaidOut, a)
    expect(loc).not.toBeNull()
    expect(relaidOut.slice(loc!.start, loc!.end)).toBe('forme des disciples')
  })

  it('choisit la BONNE occurrence via le contexte (2 « Citadelle »)', () => {
    const secondCitadelle = pageText.indexOf('Citadelle', pageText.indexOf('Citadelle') + 1)
    const a = buildAnchor({ page: 3, pageText, startOffset: secondCitadelle, endOffset: secondCitadelle + 9 })!
    const loc = locateAnchor(pageText, a)!
    expect(loc.start).toBe(secondCitadelle) // pas la première occurrence
  })

  it('renvoie null si le passage a disparu ; rejette une sélection vide', () => {
    const a = buildAnchor({ page: 1, pageText, startOffset: 3, endOffset: 13 })!
    expect(locateAnchor('Texte totalement différent.', a)).toBeNull()
    expect(buildAnchor({ page: 1, pageText, startOffset: 5, endOffset: 5 })).toBeNull()
  })
})

describe('Fusion de progression (multi-device)', () => {
  const rec = (page: number, updatedAt: number, mode: 'livre' | 'lecture' = 'livre'): ProgressRecord => ({ page, scale: 1, mode, updatedAt })

  it('choisit la plus récente', () => {
    expect(mergeProgress(rec(10, 100), rec(40, 200), 190)).toMatchObject({ source: 'server', record: { page: 40 } })
    expect(mergeProgress(rec(10, 300), rec(40, 200), 190)).toMatchObject({ source: 'local', record: { page: 10 } })
  })
  it('égalité d’horodatage → serveur (source canonique)', () => {
    expect(mergeProgress(rec(10, 200), rec(40, 200), 190).source).toBe('server')
  })
  it('une seule source, ou aucune', () => {
    expect(mergeProgress(null, rec(5, 100), 190).source).toBe('server')
    expect(mergeProgress(rec(5, 100), null, 190).source).toBe('local')
    expect(mergeProgress(null, null, 190)).toEqual({ record: null, source: 'none' })
  })
  it('borne page/zoom', () => {
    const m = mergeProgress(null, { page: 9999, scale: 99, mode: 'lecture', updatedAt: 1 }, 190)
    expect(m.record!.page).toBe(190)
    expect(m.record!.scale).toBeLessThanOrEqual(3)
  })
})

describe('Garde de sécurité — migration Study (RLS owner-only)', () => {
  const raw = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260821000000_citadelle_study_foundation.sql'),
    'utf8',
  )
  // Ignore les COMMENTAIRES (lignes `-- …`) — seules les instructions comptent.
  const sql = raw
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .toLowerCase()
    .replace(/[ \t]+/g, ' ') // aligne les espaces multiples (colonnes alignées dans le SQL)
  const tables = ['study_annotations', 'document_bookmarks', 'reading_journal', 'document_progress']

  it('RLS activée sur chaque table Study', () => {
    for (const t of tables) {
      expect(sql).toContain(`alter table public.${t} enable row level security`)
    }
  })
  it('politiques owner-only : auth.uid() = user_id, jamais using (true)', () => {
    expect(sql).toContain('auth.uid() = user_id')
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/)
  })
  it('accès réservé aux authenticated (aucun anon), avec WITH CHECK sur écriture', () => {
    expect(sql).toContain('to authenticated')
    expect(sql).toContain('with check (auth.uid() = user_id)')
    expect(sql).not.toMatch(/\bto\s+anon\b/)
  })
  it('user_id par défaut auth.uid() (le client ne choisit pas le propriétaire)', () => {
    expect(sql).toMatch(/user_id\s+uuid\s+not null\s+default\s+auth\.uid\(\)/)
  })
  it('privilèges : grant à authenticated, revoke d’anon (défense en profondeur)', () => {
    expect(sql).toMatch(/grant[\s\S]*to authenticated/)
    expect(sql).toMatch(/revoke all[\s\S]*from anon/)
  })
})

import { describe, it, expect } from 'vitest'
import { isFirstPublishTransition, isNotifiableContent, publishDedupKey } from '../content-rules'

describe('content publish notifications — règles', () => {
  it('notifie uniquement la 1re publication (draft → published) sur cms_articles', () => {
    expect(isFirstPublishTransition('cms_articles', { status: 'draft' }, { status: 'published' })).toBe(true)
  })

  it('création directe en publié = 1re publication (before null)', () => {
    expect(isFirstPublishTransition('cms_articles', null, { status: 'published' })).toBe(true)
  })

  it('création brouillon → aucune notification', () => {
    expect(isFirstPublishTransition('cms_articles', null, { status: 'draft' })).toBe(false)
  })

  it('édition d’un contenu déjà publié → aucune notification', () => {
    expect(isFirstPublishTransition('cms_articles', { status: 'published' }, { status: 'published' })).toBe(false)
  })

  it('dépublication (published → draft) → aucune notification', () => {
    expect(isFirstPublishTransition('cms_articles', { status: 'published' }, { status: 'draft' })).toBe(false)
  })

  it('formations utilise statut=publie (et non status=published)', () => {
    expect(isFirstPublishTransition('formations', { statut: 'brouillon' }, { statut: 'publie' })).toBe(true)
    expect(isFirstPublishTransition('formations', null, { status: 'published' })).toBe(false)
  })

  it('les 5 types sont notifiables, les autres non', () => {
    for (const t of ['cms_articles', 'cms_podcasts', 'cms_lives', 'cms_events', 'formations']) {
      expect(isNotifiableContent(t)).toBe(true)
    }
    for (const t of ['cms_media', 'cms_testimonies', 'cms_teachings', 'cms_pages', 'cms_homepage_blocks']) {
      expect(isNotifiableContent(t)).toBe(false)
      expect(isFirstPublishTransition(t, { status: 'draft' }, { status: 'published' })).toBe(false)
    }
  })

  it('dedup_key stable et idempotent par (table,id)', () => {
    expect(publishDedupKey('cms_articles', 'abc')).toBe('content:cms_articles:abc:published')
  })
})

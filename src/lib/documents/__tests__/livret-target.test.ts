/**
 * LB-SEC-2 — Tests de la résolution du Livret + de l'identité canonique du reader.
 * Prouve : href PDF privé = /lecture/pdf/[id] ; /livret-accueil résout le reader
 * canonique par défaut (jamais une URL Storage publique) ; compat URL legacy.
 */
import { describe, it, expect } from 'vitest'
import { pickLivretTarget, LIVRET_ACCUEIL_DOCUMENT_ID } from '../livret-target'
import { documentReaderHref } from '@/lib/pdf/document-model'

describe('documentReaderHref — identité canonique', () => {
  it('produit /lecture/pdf/[id] (utilisable même si url brute vide)', () => {
    expect(documentReaderHref({ id: 'a27ccf64-d04d-4096-ad7f-3ff1f8b2bdee' }))
      .toBe('/lecture/pdf/a27ccf64-d04d-4096-ad7f-3ff1f8b2bdee')
  })
})

describe('pickLivretTarget — défaut canonique (aucune URL Storage)', () => {
  it('réglage vide / null → reader du document canonique par défaut', () => {
    for (const v of [null, undefined, '', '   ', {}]) {
      const t = pickLivretTarget(v)
      expect(t).toEqual({ type: 'reader', path: `/lecture/pdf/${LIVRET_ACCUEIL_DOCUMENT_ID}` })
    }
  })
  it('ne renvoie JAMAIS une URL /object/public par défaut', () => {
    const t = pickLivretTarget(null)
    expect(t.type).toBe('reader')
    expect(JSON.stringify(t)).not.toContain('/object/public/')
    expect(JSON.stringify(t)).not.toContain('supabase.co')
  })
})

describe('pickLivretTarget — réglage = ID canonique', () => {
  it('UUID → reader gaté vers cet ID', () => {
    const id = 'b1234567-89ab-4cde-8f01-23456789abcd'
    expect(pickLivretTarget(id)).toEqual({ type: 'reader', path: `/lecture/pdf/${id}` })
  })
  it('UUID entre guillemets (jsonb) → nettoyé', () => {
    const id = 'b1234567-89ab-4cde-8f01-23456789abcd'
    expect(pickLivretTarget(`"${id}"`)).toEqual({ type: 'reader', path: `/lecture/pdf/${id}` })
  })
  it('objet { url: <uuid> } → reader', () => {
    const id = 'b1234567-89ab-4cde-8f01-23456789abcd'
    expect(pickLivretTarget({ url: id })).toEqual({ type: 'reader', path: `/lecture/pdf/${id}` })
  })
})

describe('pickLivretTarget — réglage legacy = URL http(s)', () => {
  it('URL explicite respectée (compat)', () => {
    const u = 'https://exemple.org/livret.pdf'
    expect(pickLivretTarget(u)).toEqual({ type: 'external', url: u })
  })
  it('objet { url } http respecté', () => {
    const u = 'https://exemple.org/livret.pdf'
    expect(pickLivretTarget({ url: u })).toEqual({ type: 'external', url: u })
  })
})

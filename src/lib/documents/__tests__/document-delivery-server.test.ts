/**
 * LB-SEC — Tests SERVEUR de getDocumentDelivery (supabaseAdmin mocké).
 * Prouve les garanties critiques :
 *   • un accès refusé ne renvoie JAMAIS d'URL ;
 *   • un document privé autorisé renvoie une URL SIGNÉE ;
 *   • le client ne peut pas contourner access_level (décision serveur) ;
 *   • fail-closed si la signature échoue sur un contenu non public.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  signedUrl: 'https://proj.supabase.co/storage/v1/object/sign/documents/livres/x.pdf?token=abc',
  signError: null as { message: string } | null,
}))

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: h.row, error: null }),
          }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: h.signError ? null : { signedUrl: h.signedUrl },
          error: h.signError,
        }),
      }),
    },
  },
}))

import { getDocumentDelivery } from '../document-delivery-server'
import type { DocumentAccessContext } from '../document-delivery'

const anon: DocumentAccessContext = { authenticated: false, isMember: false, isAdmin: false, hasPremiumEntitlement: false }
const member: DocumentAccessContext = { authenticated: true, isMember: true, isAdmin: false, hasPremiumEntitlement: false }
const premium: DocumentAccessContext = { authenticated: true, isMember: true, isAdmin: false, hasPremiumEntitlement: true }
const admin: DocumentAccessContext = { authenticated: false, isMember: false, isAdmin: true, hasPremiumEntitlement: false }

beforeEach(() => {
  h.row = null
  h.signError = null
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://proj.supabase.co'
})

function doc(over: Record<string, unknown>) {
  return { id: 'd1', type: 'pdf', status: 'published', title: 'Livre', access_level: 'public', url: '', storage_bucket: null, storage_path: null, ...over }
}

describe('getDocumentDelivery — refus = aucune URL', () => {
  it('brouillon (non-admin) → not_found sans url', async () => {
    h.row = doc({ status: 'draft' })
    const r = await getDocumentDelivery('d1', member)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('not_found')
    expect(r.url).toBeUndefined()
  })
  it('premium sans entitlement → premium_denied sans url', async () => {
    h.row = doc({ access_level: 'premium', storage_bucket: 'documents', storage_path: 'livres/x.pdf' })
    const r = await getDocumentDelivery('d1', member)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('premium_denied')
    expect(r.url).toBeUndefined()
  })
  it('member sur contenu member, anon → auth_required sans url', async () => {
    h.row = doc({ access_level: 'member', storage_bucket: 'documents', storage_path: 'livres/x.pdf' })
    const r = await getDocumentDelivery('d1', anon)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('auth_required')
    expect(r.url).toBeUndefined()
  })
})

describe('getDocumentDelivery — autorisé = URL signée pour objet privé', () => {
  it('premium avec entitlement, objet privé → URL signée', async () => {
    h.row = doc({ access_level: 'premium', url: '', storage_bucket: 'documents', storage_path: 'livres/x.pdf' })
    const r = await getDocumentDelivery('d1', premium)
    expect(r.allowed).toBe(true)
    expect(r.source).toBe('storage_signed')
    expect(r.url).toBe(h.signedUrl)
    expect(r.expiresAt).toBeTruthy()
  })
  it('member sur contenu member, objet privé → URL signée', async () => {
    h.row = doc({ access_level: 'member', storage_bucket: 'documents', storage_path: 'livres/x.pdf' })
    const r = await getDocumentDelivery('d1', member)
    expect(r.allowed).toBe(true)
    expect(r.source).toBe('storage_signed')
    expect(r.url).toBe(h.signedUrl)
  })
  it('admin prévisualise un brouillon premium → autorisé (signé)', async () => {
    h.row = doc({ status: 'draft', access_level: 'premium', storage_bucket: 'documents', storage_path: 'livres/x.pdf' })
    const r = await getDocumentDelivery('d1', admin)
    expect(r.allowed).toBe(true)
    expect(r.url).toBe(h.signedUrl)
  })
})

describe('getDocumentDelivery — fail-closed & public', () => {
  it('signature échoue sur contenu premium → no_media sans url', async () => {
    h.row = doc({ access_level: 'premium', storage_bucket: 'documents', storage_path: 'livres/x.pdf' })
    h.signError = { message: 'storage down' }
    const r = await getDocumentDelivery('d1', premium)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('no_media')
    expect(r.url).toBeUndefined()
  })
  it('document public externe, anon → autorisé avec url externe', async () => {
    h.row = doc({ access_level: 'public', url: 'https://ailleurs.example/guide.pdf' })
    const r = await getDocumentDelivery('d1', anon)
    expect(r.allowed).toBe(true)
    expect(r.source).toBe('external')
    expect(r.url).toBe('https://ailleurs.example/guide.pdf')
  })
  it('document introuvable → not_found', async () => {
    h.row = null
    const r = await getDocumentDelivery('dX', premium)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('not_found')
    expect(r.url).toBeUndefined()
  })
})

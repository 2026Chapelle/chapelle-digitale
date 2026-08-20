/**
 * LB-SEC — Tests de la livraison sécurisée des documents (partie pure).
 * Couvre la matrice public/member/premium, la résolution de source, et le
 * fail-closed de l'entitlement Premium LIVRES.
 */
import { describe, it, expect } from 'vitest'
import {
  decideDocumentAccess,
  normalizeAccessLevel,
  resolveDeliverySource,
  hasBooksPremiumAccess,
  BOOKS_PREMIUM_ENTITLEMENT_KEY,
  DOCUMENT_DELIVERY_TTL_SECONDS,
  type DocumentAccessContext,
} from '../document-delivery'

const anon: DocumentAccessContext = { authenticated: false, isMember: false, isAdmin: false, hasPremiumEntitlement: false }
const visitor: DocumentAccessContext = { authenticated: true, isMember: false, isAdmin: false, hasPremiumEntitlement: false }
const member: DocumentAccessContext = { authenticated: true, isMember: true, isAdmin: false, hasPremiumEntitlement: false }
const premium: DocumentAccessContext = { authenticated: true, isMember: true, isAdmin: false, hasPremiumEntitlement: true }
const admin: DocumentAccessContext = { authenticated: false, isMember: false, isAdmin: true, hasPremiumEntitlement: false }

describe('decideDocumentAccess — PUBLIC', () => {
  it('autorise tout le monde (anon, visiteur, membre, premium)', () => {
    for (const ctx of [anon, visitor, member, premium]) {
      expect(decideDocumentAccess('public', ctx)).toEqual({ allowed: true, reason: 'ok' })
    }
  })
})

describe('decideDocumentAccess — MEMBER', () => {
  it('anon → refusé auth_required', () => {
    expect(decideDocumentAccess('member', anon)).toEqual({ allowed: false, reason: 'auth_required' })
  })
  it('authentifié non-membre (visiteur) → refusé member_only', () => {
    expect(decideDocumentAccess('member', visitor)).toEqual({ allowed: false, reason: 'member_only' })
  })
  it('membre → autorisé', () => {
    expect(decideDocumentAccess('member', member)).toEqual({ allowed: true, reason: 'ok' })
  })
})

describe('decideDocumentAccess — PREMIUM', () => {
  it('anon → refusé auth_required', () => {
    expect(decideDocumentAccess('premium', anon)).toEqual({ allowed: false, reason: 'auth_required' })
  })
  it('membre SANS entitlement → refusé premium_denied', () => {
    expect(decideDocumentAccess('premium', member)).toEqual({ allowed: false, reason: 'premium_denied' })
  })
  it('membre AVEC entitlement premium → autorisé', () => {
    expect(decideDocumentAccess('premium', premium)).toEqual({ allowed: true, reason: 'ok' })
  })
})

describe('decideDocumentAccess — ADMIN & fail-safe', () => {
  it('admin peut toujours résoudre (preview)', () => {
    for (const lvl of ['public', 'member', 'premium'] as const) {
      expect(decideDocumentAccess(lvl, admin)).toEqual({ allowed: true, reason: 'ok' })
    }
  })
  it('normalizeAccessLevel : valeur inconnue → défaut prudent member', () => {
    expect(normalizeAccessLevel('n_importe_quoi')).toBe('member')
    expect(normalizeAccessLevel(undefined)).toBe('member')
    expect(normalizeAccessLevel('premium')).toBe('premium')
  })
})

describe('resolveDeliverySource', () => {
  it('privilégie storage_bucket/storage_path (document privé, url vide)', () => {
    const s = resolveDeliverySource({ url: '', storage_bucket: 'documents', storage_path: 'livres/abc.pdf' })
    expect(s).toEqual({ kind: 'storage', bucket: 'documents', path: 'livres/abc.pdf' })
  })
  it('sans storage explicite, classe une URL Storage Supabase', () => {
    const url = 'https://proj.supabase.co/storage/v1/object/public/media/doc.pdf'
    const s = resolveDeliverySource({ url, storage_bucket: null, storage_path: null }, 'proj.supabase.co')
    expect(s.kind).toBe('storage')
    expect(s.bucket).toBe('media')
    expect(s.path).toBe('doc.pdf')
  })
  it('URL externe → external', () => {
    const s = resolveDeliverySource({ url: 'https://ailleurs.example/x.pdf', storage_bucket: null, storage_path: null }, 'proj.supabase.co')
    expect(s.kind).toBe('external')
  })
  it('aucune source → none', () => {
    expect(resolveDeliverySource({ url: '', storage_bucket: null, storage_path: null }).kind).toBe('none')
  })
})

describe('hasBooksPremiumAccess — fail-closed', () => {
  const client = (impl: () => { data: unknown; error: unknown }) => ({
    rpc: async () => impl(),
  })
  it('sans userId → false (aucune RPC)', async () => {
    let called = false
    const c = { rpc: async () => { called = true; return { data: true, error: null } } }
    expect(await hasBooksPremiumAccess(c, null)).toBe(false)
    expect(called).toBe(false)
  })
  it('data === true → true', async () => {
    expect(await hasBooksPremiumAccess(client(() => ({ data: true, error: null })), 'u1')).toBe(true)
  })
  it('data === false → false', async () => {
    expect(await hasBooksPremiumAccess(client(() => ({ data: false, error: null })), 'u1')).toBe(false)
  })
  it('erreur RPC → false', async () => {
    expect(await hasBooksPremiumAccess(client(() => ({ data: null, error: { message: 'boom' } })), 'u1')).toBe(false)
  })
  it('réponse non booléenne → false', async () => {
    expect(await hasBooksPremiumAccess(client(() => ({ data: 'yes', error: null })), 'u1')).toBe(false)
  })
  it('exception → false', async () => {
    const c = { rpc: async () => { throw new Error('network') } }
    expect(await hasBooksPremiumAccess(c, 'u1')).toBe(false)
  })
})

describe('constantes canoniques', () => {
  it("clé d'entitlement = books_premium", () => {
    expect(BOOKS_PREMIUM_ENTITLEMENT_KEY).toBe('books_premium')
  })
  it('TTL de signature raisonnable (> 0, ≤ 6h)', () => {
    expect(DOCUMENT_DELIVERY_TTL_SECONDS).toBeGreaterThan(0)
    expect(DOCUMENT_DELIVERY_TTL_SECONDS).toBeLessThanOrEqual(6 * 60 * 60)
  })
})

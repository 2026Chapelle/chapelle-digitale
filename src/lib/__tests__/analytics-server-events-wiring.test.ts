import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Câblage des événements métier serveur : appel idempotent depuis les routes
 * d’écriture, jamais bloquant pour l’utilisateur.
 */
const m = vi.hoisted(() => ({
  record: vi.fn(),
  getVerifiedUser: vi.fn(),
  profileRow: null as Record<string, unknown> | null,
  memberExisting: null as Record<string, unknown> | null,
  insertForOrganization: vi.fn(),
}))

vi.mock('@/lib/analytics-server-events', () => ({ recordServerEvent: m.record }))
vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: () => ({ ok: true }), clientIp: () => '0.0.0.0' }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/email-templates', () => ({ welcomeEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/supabase-server', () => ({ createRouteClient: () => ({}), getVerifiedUser: m.getVerifiedUser }))

function chain(final: () => unknown) {
  const q: any = {}
  for (const k of ['select', 'eq', 'ilike', 'update', 'upsert']) q[k] = () => q
  q.single = () => Promise.resolve(final())
  q.maybeSingle = () => Promise.resolve(final())
  q.then = (r: any, j: any) => Promise.resolve({ error: null }).then(r, j)
  return q
}
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: () => chain(() => ({ data: m.profileRow, error: null })),
    schema: () => ({
      from: (t: string) => {
        if (t === 'platforms') return chain(() => ({ data: { id: 'p1' } }))
        if (t === 'members') {
          const q = chain(() => ({ data: m.memberExisting }))
          q.insert = () => chain(() => ({ data: { id: 'member-1' } }))
          return q
        }
        const q = chain(() => ({ data: null }))
        q.insert = () => Promise.resolve({ error: null })
        return q
      },
    }),
  },
}))
vi.mock('@/lib/pastoral/newcomer-admin-client', () => ({
  getNewcomerIntakesRepository: () => ({ insertForOrganization: m.insertForOrganization }),
  getNewcomerOrgLookupClient: () => ({}),
  resolvePublicNewcomerOrganizationId: async () => 'org-1',
}))

const UID = '11111111-2222-4333-8444-555555555555'
const json = (body: unknown) => ({ json: async () => body, headers: new Headers() }) as any

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.FLUENTCRM_BASE_URL
  m.getVerifiedUser.mockResolvedValue({ id: UID })
  m.record.mockResolvedValue({ status: 'inserted' })
  m.memberExisting = null
  m.insertForOrganization.mockResolvedValue({ id: 'intake-1' })
})

describe('PATCH /api/member/profile → signup_complete', () => {
  it('enregistre l’inscription d’un compte récent, datée à la création du profil', async () => {
    const created = new Date(Date.now() - 60_000).toISOString()
    m.profileRow = { id: UID, created_at: created }
    const { PATCH } = await import('@/app/api/member/profile/route')
    const res = await PATCH(json({ prenom: 'A' }))
    expect(res.status).toBe(200)
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'signup_complete', entityId: UID, userId: UID, path: '/bienvenue', occurredAt: created,
    }))
  })

  it('ignore un ancien compte qui modifie son profil (pas une nouvelle inscription)', async () => {
    m.profileRow = { id: UID, created_at: new Date(Date.now() - 90 * 86400_000).toISOString() }
    const { PATCH } = await import('@/app/api/member/profile/route')
    expect((await PATCH(json({ ville: 'Kinshasa' }))).status).toBe(200)
    expect(m.record).not.toHaveBeenCalled()
  })

  it('reste 200 si l’enregistrement de l’événement échoue', async () => {
    m.profileRow = { id: UID, created_at: new Date().toISOString() }
    m.record.mockRejectedValue(new Error('boom'))
    const { PATCH } = await import('@/app/api/member/profile/route')
    const res = await PATCH(json({ prenom: 'A' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})

describe('POST /api/tunnel/lead → lead_created', () => {
  it('enregistre un lead seulement pour un nouveau contact', async () => {
    const { POST } = await import('@/app/api/tunnel/lead/route')
    const res = await POST(json({ prenom: 'A', email: 'a@b.fr', stage: 'contact' }))
    expect(res.status).toBe(200)
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({ kind: 'lead_created', entityId: 'member-1', path: '/api/tunnel/lead' }))
    const arg = m.record.mock.calls[0][0]
    expect(JSON.stringify(arg)).not.toContain('a@b.fr')
  })

  it('n’enregistre rien pour un contact existant et ne bloque jamais', async () => {
    m.memberExisting = { id: 'member-0' }
    const { POST } = await import('@/app/api/tunnel/lead/route')
    expect((await POST(json({ prenom: 'A', email: 'a@b.fr' }))).status).toBe(200)
    expect(m.record).not.toHaveBeenCalled()

    m.memberExisting = null
    m.record.mockRejectedValue(new Error('boom'))
    expect((await POST(json({ prenom: 'A', email: 'c@d.fr' }))).status).toBe(200)
  })
})

describe('POST /api/nouveau-venu → newcomer_created', () => {
  it('enregistre la fiche créée avec l’organisation résolue côté serveur', async () => {
    const { POST } = await import('@/app/api/nouveau-venu/route')
    const res = await POST(json({ prenom: 'Abel', telephone: '0102', email: 'x@y.fr', consent: true, organization_id: 'pirate' }))
    expect(res.status).toBe(200)
    expect(m.record).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'newcomer_created', entityId: 'intake-1', meta: { organization_id: 'org-1' },
    }))
  })

  it('reste 200 si l’événement échoue', async () => {
    m.record.mockRejectedValue(new Error('boom'))
    const { POST } = await import('@/app/api/nouveau-venu/route')
    expect((await POST(json({ prenom: 'Abel', telephone: '0102', consent: true }))).status).toBe(200)
  })
})

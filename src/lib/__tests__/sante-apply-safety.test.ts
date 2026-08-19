/**
 * P0 — Santé Apply Safety.
 * Prouve que POST /api/admin/sante {apply:true} ne peut plus écrire de statut :
 *  - aucune mutation profiles.update n'est atteignable ;
 *  - réponse explicite 409 + code AUTOMATIC_STATUS_APPLY_DISABLED ;
 *  - l'analyse GET reste opérationnelle ;
 *  - l'UI n'offre plus d'action trompeuse d'application automatique.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: vi.fn() },
  IS_DEMO_MODE: false,
}))
vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest: vi.fn(),
}))

// Import after mocks
import * as santeRoute from '@/app/api/admin/sante/route'
import { isAdminRequest } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

function req(method: string, body?: any) {
  const r = new NextRequest('http://localhost/api/admin/sante', {
    method,
    headers: new Headers({ 'content-type': 'application/json' }),
  })
  if (body !== undefined) {
    // @ts-ignore - override for test
    r.json = vi.fn().mockResolvedValue(body)
  }
  return r
}

/** from() mock exposant un espion update pour prouver qu'il n'est JAMAIS appelé. */
function installFromSpy() {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockResolvedValue({ data: [] }),
    update,
    eq: vi.fn().mockReturnThis(),
  })
  ;(supabaseAdmin as any).from = from
  return { from, update }
}

describe('P0 Santé Apply Safety — POST {apply} neutralisé', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
  })

  it('apply:true → 409 + code AUTOMATIC_STATUS_APPLY_DISABLED (jamais {ok:true, applied})', async () => {
    const { from, update } = installFromSpy()
    const res = await santeRoute.POST(req('POST', { apply: true }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.code).toBe('AUTOMATIC_STATUS_APPLY_DISABLED')
    expect(body).not.toHaveProperty('applied')
    // Aucun chemin d'écriture : ni analyse, ni update sur profiles.
    expect(from).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it('apply:true → aucun changement de statut possible (profiles.update jamais atteint)', async () => {
    const { from, update } = installFromSpy()
    await santeRoute.POST(req('POST', { apply: true }))
    const touchedProfiles = (from as any).mock.calls.some((c: any[]) => c[0] === 'profiles')
    expect(touchedProfiles).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('sans admin → 401 (garde préservée)', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const res = await santeRoute.POST(req('POST', { apply: true }))
    expect(res.status).toBe(401)
  })

  it('POST sans apply → 400 (comportement inchangé)', async () => {
    installFromSpy()
    const res = await santeRoute.POST(req('POST', {}))
    expect(res.status).toBe(400)
  })
})

describe('P0 Santé Apply Safety — GET analyse préservé', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(isAdminRequest as any).mockReturnValue(true)
  })

  it('GET → 200 et distribution calculée (lecture opérationnelle)', async () => {
    const nowIso = new Date().toISOString()
    ;(supabaseAdmin as any).from = vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue({
        data: table === 'profiles'
          ? [{ id: 'u1', prenom: 'A', nom: 'B', pays: 'FR', membre_statut: 'membre_actif', role: 'membre', score_engagement: 10, created_at: nowIso }]
          : [],
      }),
    }))
    const res = await santeRoute.GET(req('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.total).toBe(1)
    expect(body.parCouleur).toBeDefined()
    expect(body.parClasse).toBeDefined()
  })

  it('GET sans admin → 401', async () => {
    ;(isAdminRequest as any).mockReturnValue(false)
    const res = await santeRoute.GET(req('GET'))
    expect(res.status).toBe(401)
  })
})

describe('P0 Santé Apply Safety — UI ne propose plus d’application automatique', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/app/(admin)/admin/sante-spirituelle/page.tsx'),
    'utf8',
  )

  it('la page ne poste plus apply:true', () => {
    expect(src).not.toMatch(/apply:\s*true/)
  })

  it('le libellé trompeur « appliquer les statuts » a disparu', () => {
    expect(src).not.toMatch(/appliquer les statuts/i)
  })

  it('la page affiche l’avis de désactivation + une action de lecture seule', () => {
    expect(src).toMatch(/temporairement désactivée/)
    expect(src).toMatch(/validation pastorale/)
    expect(src).toMatch(/Recalculer l&apos;analyse/)
  })
})

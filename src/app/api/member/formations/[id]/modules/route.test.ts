import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getSessionProfile: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/member-auth', () => ({ getSessionProfile: mocks.getSessionProfile }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from, storage: { from: vi.fn() } } }))
vi.mock('@/lib/formations/parcours-gate-server', () => ({ parcoursGate: vi.fn().mockResolvedValue({ parcours_locked: false, parcours_lock_reason: null, previous_formation: null, next_formation: null }) }))
vi.mock('@/lib/formations/module-daily-unlock', () => ({ DAILY_LOCK_REASON: 'daily', evaluateDailyLock: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ can: vi.fn().mockReturnValue(false) }))

import { GET } from './route'

const session = { uid: 'server-user', role: 'membre', profile: { membre_statut: 'membre' } }
const module = { id: 'module-1', ordre: 1, titre: 'Support', description: null, type: 'pdf', status: 'published', acces_min_statut: 'membre', prerequis_module_id: null, youtube_id: null, video_url: null, video_path: null, source_video: null, audio_url: null, pdf_url: 'https://files.test/support.pdf', contenu_texte: null, duree_minutes: 10 }
const maybe = (data: unknown) => ({ maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) })

function queries(slug: string, completed: boolean) {
  return (table: string) => {
    if (table === 'formations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(maybe({ id: 'formation-1', slug, type: 'cours', niveau: 'debutant', categorie: null })) }) }
    if (table === 'inscriptions_formation') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(maybe({ id: 'enrollment-1' })) }) }) }
    if (table === 'formation_modules') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockResolvedValue({ data: [module], error: null }) }) }) }) }
    if (table === 'module_completions') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: completed ? [{ module_id: 'module-1', completed_at: '2026-10-19T10:00:00.000Z' }] : [], error: null }) }) }) }
    if (table === 'video_progress') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }) }
    throw new Error(`Unexpected table: ${table}`)
  }
}

const request = () => new NextRequest('https://citadelle.test/api/member/formations/formation-1/modules')
const params = () => ({ params: Promise.resolve({ id: 'formation-1' }) })

describe('GET /api/member/formations/[id]/modules PDF access', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getSessionProfile.mockResolvedValue(session) })

  it('masks a non-Sentinelles PDF before module completion', async () => {
    mocks.from.mockImplementation(queries('fondements-de-la-foi', false))
    const response = await GET(request(), params())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { modules: [expect.objectContaining({ pdf_url: null, pdf_locked: true, completed: false })] } })
  })

  it('reveals a non-Sentinelles PDF after module completion', async () => {
    mocks.from.mockImplementation(queries('fondements-de-la-foi', true))
    const response = await GET(request(), params())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { modules: [expect.objectContaining({ pdf_url: 'https://files.test/support.pdf', pdf_locked: false, completed: true })] } })
  })

  it('reveals a Sentinelles PDF before completion to an enrolled authorized member', async () => {
    mocks.from.mockImplementation(queries('ecole-des-sentinelles', false))
    const response = await GET(request(), params())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, data: { enrolled: true, modules: [expect.objectContaining({ locked: false, pdf_url: 'https://files.test/support.pdf', pdf_locked: false, completed: false })] } })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getSessionProfile: vi.fn(), from: vi.fn() }))

vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/member-auth', () => ({ getSessionProfile: mocks.getSessionProfile }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))
vi.mock('@/lib/formations/parcours-gate-server', () => ({ parcoursGate: vi.fn().mockResolvedValue({ parcours_locked: false }) }))
vi.mock('@/lib/formations/statut-progression', () => ({ computeCommunityIntegration: vi.fn() }))
vi.mock('@/lib/formations/integration-progress-server', () => ({ ensureIntegrationCertificate: vi.fn() }))
vi.mock('@/lib/formations/video-validation', () => ({ WATCH_THRESHOLD: 90, hasPlayableVideo: vi.fn().mockReturnValue(true) }))
vi.mock('@/lib/formations/module-daily-unlock', () => ({ evaluateDailyLock: vi.fn() }))
vi.mock('@/lib/permissions', () => ({ can: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/notifications/events', () => ({ notifyModuleCompleted: vi.fn(), notifyParcoursCompleted: vi.fn(), notifyCertificate: vi.fn(), notifyAcademieUnlocked: vi.fn() }))

import { POST } from './route'

const session = { uid: 'server-user', role: 'membre', profile: { membre_statut: 'membre' } }
const maybe = (data: unknown) => ({ maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) })

function queryFor(table: string) {
  if (table === 'inscriptions_formation') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(maybe({ id: 'enrollment-1' })) }) }) }
  if (table === 'formation_modules') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(maybe({ id: 'module-1', titre: 'Module', status: 'published', prerequis_module_id: null, youtube_id: 'video-id', video_url: null, source_video: 'youtube', video_path: null, audio_url: null, pdf_url: 'https://files.test/module.pdf' })) }) }) }
  if (table === 'formations') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(maybe({ titre: 'Formation classique', certifiant: false, slug: 'fondements-de-la-foi' })) }) }
  if (table === 'video_progress') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue(maybe({ percent_watched: 89, completed: false })) }) }) }
  throw new Error(`Unexpected table: ${table}`)
}

describe('POST /api/member/formations/progress', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.getSessionProfile.mockResolvedValue(session); mocks.from.mockImplementation(queryFor) })

  it('refuses a non-Sentinelles module watched below 90%', async () => {
    const request = new NextRequest('https://citadelle.test/api/member/formations/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ module_id: 'module-1', formation_id: 'formation-1' }) })

    const response = await POST(request)

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({ ok: false, message: expect.stringContaining('90%') })
  })
})

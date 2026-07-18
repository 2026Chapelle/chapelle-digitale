/**
 * Auth consolidée Lot 5 — identité Route Handler + redirections safe.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isAllowedAuthNext,
  sanitizeAuthNext,
  resolveAuthRedirectOrigin,
  AUTH_CALLBACK_NEXT_ALLOWLIST,
} from '@/lib/auth/safe-redirect'

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: { from: vi.fn() },
}))
vi.mock('@/lib/supabase-server', () => ({
  createRouteClient: vi.fn(),
  createServerClient: vi.fn(),
  getServerProfile: vi.fn(),
}))

import { createRouteClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { resolveAdminActorProfile, UnitAccessError } from '@/lib/erp/unit-access'

describe('safe-redirect allowlist', () => {
  it('autorise les chemins internes connus', () => {
    expect(isAllowedAuthNext('/admin/update-password')).toBe(true)
    expect(isAllowedAuthNext('/member/dashboard')).toBe(true)
    expect(AUTH_CALLBACK_NEXT_ALLOWLIST).toContain('/admin/update-password')
  })

  it('refuse open-redirect et chemins hors liste', () => {
    expect(isAllowedAuthNext('https://evil.com')).toBe(false)
    expect(isAllowedAuthNext('//evil.com')).toBe(false)
    expect(isAllowedAuthNext('/admin/../secret')).toBe(false)
    expect(isAllowedAuthNext('/evil')).toBe(false)
    expect(sanitizeAuthNext('/evil', '/member/dashboard')).toBe('/member/dashboard')
    expect(sanitizeAuthNext('/admin/update-password')).toBe('/admin/update-password')
  })

  it('origine localhost conservée pour recovery locale', () => {
    expect(
      resolveAuthRedirectOrigin('http://localhost:3000/auth/callback?code=x', 'https://prod.example'),
    ).toBe('http://localhost:3000')
    expect(
      resolveAuthRedirectOrigin('https://prod.example/auth/callback', 'https://prod.example'),
    ).toBe('https://prod.example')
  })
})

describe('getVerifiedRouteProfile + resolveAdminActorProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sans user getUser → null / actor_required', async () => {
    ;(createRouteClient as any).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    })
    await expect(getVerifiedRouteProfile()).resolves.toBeNull()
    await expect(resolveAdminActorProfile()).rejects.toMatchObject({
      errorCode: 'actor_required',
      status: 403,
    })
  })

  it('user sans profil SQL → null / actor_required', async () => {
    ;(createRouteClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1', email: 'a@b.c' } },
          error: null,
        }),
      },
    })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(chain)
    await expect(getVerifiedRouteProfile()).resolves.toBeNull()
    await expect(resolveAdminActorProfile()).rejects.toBeInstanceOf(UnitAccessError)
  })

  it('user_metadata.role=admin sans ligne profiles → null (pas d’élévation metadata)', async () => {
    ;(createRouteClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'u-meta',
              email: 'meta@b.c',
              user_metadata: { role: 'admin' },
            },
          },
          error: null,
        }),
      },
    })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(chain)
    await expect(getVerifiedRouteProfile()).resolves.toBeNull()
  })

  it('user + profil → acteur résolu (même UUID, email profil)', async () => {
    ;(createRouteClient as any).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'u-owner', email: 'elus@example.com' } },
          error: null,
        }),
      },
    })
    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'u-owner', email: 'elus@example.com', role: 'admin' },
        error: null,
      }),
    }
    ;(supabaseAdmin as any).from = vi.fn().mockReturnValue(chain)

    const sp = await getVerifiedRouteProfile()
    expect(sp?.uid).toBe('u-owner')
    expect(sp?.role).toBe('admin')

    const actor = await resolveAdminActorProfile()
    expect(actor.userId).toBe('u-owner')
    expect(actor.email).toBe('elus@example.com')
    expect(actor.role).toBe('admin')
    // getUser utilisé (pas seulement getSession)
    expect(createRouteClient).toHaveBeenCalled()
  })
})

describe('recovery pages static contracts', () => {
  it('forgot-password admin : redirectTo same-origin + next update-password + message neutre', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(process.cwd(), 'src/app/(admin)/admin/forgot-password/page.tsx'),
      'utf8',
    )
    expect(src).toContain('resetPasswordForEmail')
    expect(src).toContain('/admin/update-password')
    expect(src).toContain('window.location.origin')
    expect(src).toContain('Si ce compte existe, un lien de réinitialisation a été envoyé.')
    expect(src).not.toMatch(/redirectTo:\s*email/)
  })

  it('update-password : updateUser, refuse sans session, pas de cier_admin', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(
      join(process.cwd(), 'src/app/(admin)/admin/update-password/page.tsx'),
      'utf8',
    )
    expect(src).toContain('updateUser')
    expect(src).toContain('Session de récupération absente')
    expect(src).toContain('signOut')
    expect(src).not.toContain('cier_admin')
    expect(src).toContain('Les deux mots de passe ne correspondent pas')
  })

  it('callback auth : exchangeCodeForSession + allowlist', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'src/app/auth/callback/route.ts'), 'utf8')
    expect(src).toContain('exchangeCodeForSession')
    expect(src).toContain('sanitizeAuthNext')
    expect(src).toContain('error=recovery')
  })
})

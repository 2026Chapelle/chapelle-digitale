import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATION = join(
  process.cwd(),
  'supabase/migrations/20260717130000_citadelle_erp_lot6_invitation_create_revoke_rpc.sql',
)

const REPO = join(process.cwd(), 'src/lib/erp/unit-governance-repository.ts')

describe('Lot 6 — invitation create/revoke RPC migration static security', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('transaction unique BEGIN/COMMIT', () => {
    expect(sql).toMatch(/^\s*BEGIN\s*;/m)
    expect(sql.includes('\nCOMMIT;') || sql.trim().endsWith('COMMIT;')).toBe(true)
  })

  it('fail-fast si tables/fonctions Lot 6 absentes', () => {
    expect(sql).toContain('organization_unit_invitations missing')
    expect(sql).toContain('organization_unit_governance_events missing')
    expect(sql).toContain('erp_actor_can_write_unit missing')
    expect(sql).toContain('erp_assignable_roles missing')
    expect(sql).toContain('erp_unit_role_fits_type missing')
  })

  it('fonctions create + revoke présentes', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.erp_unit_invitation_create')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.erp_unit_invitation_revoke')
    expect(sql).toContain('p_token_hash')
    expect(sql).toContain('p_expires_at')
  })

  it('token clair jamais en SQL — seulement p_token_hash', () => {
    expect(sql).toMatch(/p_token_hash\s+text/)
    expect(sql).not.toMatch(/p_token\s+text/)
    expect(sql).not.toMatch(/p_clear_token/)
    expect(sql).not.toContain('generateInviteToken')
  })

  it('guards create: role invitable, write unit, assignable, fits type, events', () => {
    expect(sql).toContain('role not invitable')
    expect(sql).toContain("p_role = 'world_super_admin'")
    expect(sql).toContain('erp_actor_can_write_unit')
    expect(sql).toContain('erp_assignable_roles')
    expect(sql).toContain('erp_unit_role_fits_type')
    expect(sql).toContain("'invite_create'")
  })

  it('revoke: pending only, FOR UPDATE, revoked + invite_revoke', () => {
    expect(sql).toContain('invitation not pending')
    expect(sql).toMatch(/FOR UPDATE/)
    expect(sql).toContain("status = 'revoked'")
    expect(sql).toContain("'invite_revoke'")
  })

  it('SECURITY DEFINER + search_path public, pg_temp', () => {
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toMatch(/SET search_path\s*=\s*public,\s*pg_temp/)
  })

  it('REVOKE ALL PUBLIC/anon/authenticated + GRANT service_role only', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.erp_unit_invitation_create\([^)]+\)\s+FROM PUBLIC,\s*anon,\s*authenticated/,
    )
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.erp_unit_invitation_revoke\([^)]+\)\s+FROM PUBLIC,\s*anon,\s*authenticated/,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_unit_invitation_create\([^)]+\)\s+TO service_role/,
    )
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_unit_invitation_revoke\([^)]+\)\s+TO service_role/,
    )
    expect(sql).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.erp_unit_invitation_create[^;]+TO authenticated/i,
    )
  })

  it('postchecks présence fonctions', () => {
    expect(sql).toContain('Lot6 invite rpc postcheck')
    expect(sql).toContain('erp_unit_invitation_create missing')
    expect(sql).toContain('erp_unit_invitation_revoke missing')
  })
})

describe('Lot 6 — repository invite mutations via RPC only', () => {
  const repo = readFileSync(REPO, 'utf8')

  it('createInvitation appelle rpcCreateInvitation (pas insert invitations)', () => {
    expect(repo).toContain('rpcCreateInvitation')
    expect(repo).toMatch(/export async function createInvitation[\s\S]*rpcCreateInvitation/)
    // pas d'INSERT direct sur organization_unit_invitations dans createInvitation
    const createBody = repo.slice(
      repo.indexOf('export async function createInvitation'),
      repo.indexOf('export async function revokeInvitation'),
    )
    expect(createBody).not.toMatch(/\.from\(\s*['"]organization_unit_invitations['"]\s*\)\s*\.insert/)
    expect(createBody).not.toContain('.insert(')
  })

  it('revokeInvitation appelle rpcRevokeInvitation (pas update direct)', () => {
    expect(repo).toContain('rpcRevokeInvitation')
    const revokeBody = repo.slice(
      repo.indexOf('export async function revokeInvitation'),
      repo.indexOf('export async function listInvitationsForUnit'),
    )
    expect(revokeBody).toContain('rpcRevokeInvitation')
    expect(revokeBody).not.toMatch(/\.from\(\s*['"]organization_unit_invitations['"]\s*\)\s*\.update/)
    expect(revokeBody).not.toContain('.update(')
  })

  it('listInvitationsForUnit ne sélectionne pas token_hash', () => {
    const invColsMatch = repo.match(/const INV_COLS\s*=\s*\n?\s*'([^']+)'/)
    expect(invColsMatch).toBeTruthy()
    const cols = invColsMatch![1]
    expect(cols).toContain('email')
    expect(cols).toContain('proposed_unit_role')
    expect(cols).not.toContain('token_hash')
    const listBody = repo.slice(
      repo.indexOf('export async function listInvitationsForUnit'),
      repo.indexOf('export async function getInvitationByTokenHash'),
    )
    expect(listBody).toContain('INV_COLS')
    expect(listBody).not.toContain('token_hash')
  })
})

const rpcMock = vi.fn()

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: vi.fn(),
  },
  IS_DEMO_MODE: false,
}))

import { rpcCreateInvitation, rpcRevokeInvitation } from '@/lib/erp/unit-governance-rpc'
import { createInvitation, revokeInvitation } from '@/lib/erp/unit-governance-repository'

describe('Lot 6 — rpcCreateInvitation / rpcRevokeInvitation wrappers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rpcCreateInvitation mappe les params SQL', async () => {
    rpcMock.mockResolvedValue({ data: 'inv-1', error: null })
    const res = await rpcCreateInvitation({
      orgId: 'org',
      unitId: 'unit',
      email: 'a@b.c',
      role: 'member',
      actorId: 'actor',
      tokenHash: 'hash-value-long-enough',
      expiresAt: '2030-01-01T00:00:00.000Z',
    })
    expect(res.id).toBe('inv-1')
    expect(res.error).toBeNull()
    expect(rpcMock).toHaveBeenCalledWith('erp_unit_invitation_create', {
      p_org_id: 'org',
      p_unit_id: 'unit',
      p_email: 'a@b.c',
      p_role: 'member',
      p_actor_id: 'actor',
      p_token_hash: 'hash-value-long-enough',
      p_expires_at: '2030-01-01T00:00:00.000Z',
    })
  })

  it('rpcRevokeInvitation mappe les params SQL', async () => {
    rpcMock.mockResolvedValue({ data: 'inv-2', error: null })
    const res = await rpcRevokeInvitation({
      orgId: 'org',
      invitationId: 'inv-2',
      actorId: 'actor',
    })
    expect(res.id).toBe('inv-2')
    expect(rpcMock).toHaveBeenCalledWith('erp_unit_invitation_revoke', {
      p_org_id: 'org',
      p_invitation_id: 'inv-2',
      p_actor_id: 'actor',
    })
  })

  it('createInvitation génère token/hash et appelle RPC (pas insert)', async () => {
    rpcMock.mockResolvedValue({ data: 'inv-new', error: null })
    const res = await createInvitation({
      orgId: 'org',
      unitId: 'unit',
      email: '  A@B.C ',
      proposedRole: 'staff',
      invitedBy: 'actor',
    })
    expect(res.invitationId).toBe('inv-new')
    expect(res.token.length).toBeGreaterThanOrEqual(32)
    expect(rpcMock).toHaveBeenCalledWith(
      'erp_unit_invitation_create',
      expect.objectContaining({
        p_org_id: 'org',
        p_unit_id: 'unit',
        p_email: 'a@b.c',
        p_role: 'staff',
        p_actor_id: 'actor',
        p_token_hash: expect.any(String),
        p_expires_at: expect.any(String),
      }),
    )
    // token clair jamais envoyé à la RPC
    const call = rpcMock.mock.calls[0][1] as Record<string, string>
    expect(call.p_token_hash).not.toBe(res.token)
    expect(call).not.toHaveProperty('p_token')
  })

  it('revokeInvitation délègue uniquement à la RPC', async () => {
    rpcMock.mockResolvedValue({ data: 'inv-r', error: null })
    await revokeInvitation({ orgId: 'org', invitationId: 'inv-r', actorId: 'actor' })
    expect(rpcMock).toHaveBeenCalledWith('erp_unit_invitation_revoke', {
      p_org_id: 'org',
      p_invitation_id: 'inv-r',
      p_actor_id: 'actor',
    })
  })
})

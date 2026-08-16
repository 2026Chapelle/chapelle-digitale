/**
 * Lot 6 UI finalization — tests statiques + pure functions (Agent 3).
 * Prouve : expectedChildType, no child under local, 4 email outcomes mapping,
 * no token in response contract, migration 17130000 git hash-object a7f8784f…,
 * présence composants ConfirmAction / MemberSearchSelect, notes search scope.
 */
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { expectedChildType, isPathDescendantOrSelf } from '@/core/erp/unit'

/** Équivalent `git hash-object <file>` : sha1("blob <size>\\0" + content). */
function gitHashObject(buf: Buffer): string {
  return createHash('sha1')
    .update(`blob ${buf.length}\0`)
    .update(buf)
    .digest('hex')
}

const ROOT = process.cwd()
const MIG_17130000 = join(
  ROOT,
  'supabase/migrations/20260717130000_citadelle_erp_lot6_invitation_create_revoke_rpc.sql',
)
const PARAM = join(ROOT, 'src/app/(admin)/admin/parametres')
const INV_ROUTE = join(
  ROOT,
  'src/app/api/admin/organization-unit-invitations/route.ts',
)
const REPO = join(ROOT, 'src/lib/erp/unit-governance-repository.ts')
const PERMS_ROUTE = join(
  ROOT,
  'src/app/api/admin/organization-unit-effective-permissions/route.ts',
)

describe('Lot 6 UI — expectedChildType (création enfant)', () => {
  it('chaîne HQ → zone → national → local', () => {
    expect(expectedChildType('world_headquarters')).toBe('continental_zone')
    expect(expectedChildType('continental_zone')).toBe('national_central_church')
    expect(expectedChildType('national_central_church')).toBe('local_church')
  })

  it('pas d’enfant sous local_church', () => {
    expect(expectedChildType('local_church')).toBeNull()
  })
})

describe('Lot 6 UI — path regression (hiérarchie)', () => {
  it('isPathDescendantOrSelf respecte les frontières de segment', () => {
    expect(isPathDescendantOrSelf('/a/', '/a/b/')).toBe(true)
    expect(isPathDescendantOrSelf('/ab/', '/abc/')).toBe(false)
    expect(isPathDescendantOrSelf('/a/', '/a/')).toBe(true)
  })
})

describe('Lot 6 UI — migration 17130000 byte-identique', () => {
  it('git hash-object + SHA256 figés (migration inchangée)', () => {
    expect(existsSync(MIG_17130000)).toBe(true)
    const buf = readFileSync(MIG_17130000)
    // Empreintes figées sur le contenu canonique stocké par Git (LF) — on
    // normalise donc les fins de ligne avant hachage pour rester indépendant
    // du mode de checkout local (CRLF sous Windows selon core.autocrlf).
    const normalizedBuf = Buffer.from(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
    expect(gitHashObject(normalizedBuf)).toBe('a7f8784f47fad899c2365a5081c2da25e656e885')
    const sha256 = createHash('sha256').update(normalizedBuf).digest('hex').toUpperCase()
    expect(sha256).toBe('9546B1358F321547FAE5DA248D0FC778612ACB5778385951F3F364ACECD08836')
  })
})

describe('Lot 6 UI — composants présence + wiring', () => {
  it('ConfirmAction.tsx accessible (dialog / aria)', () => {
    const src = readFileSync(join(PARAM, 'ConfirmAction.tsx'), 'utf8')
    expect(src).toContain('role="dialog"')
    expect(src).toContain('aria-modal')
    expect(src).toContain('Confirmer')
    expect(src).toContain('Annuler')
    expect(src).toMatch(/Escape|onCancel/)
  })

  it('MemberSearchSelect.tsx debounced membres API', () => {
    const src = readFileSync(join(PARAM, 'MemberSearchSelect.tsx'), 'utf8')
    expect(src).toContain('/api/admin/membres')
    expect(src).toContain('pageSize=8')
    expect(src).toMatch(/300|debounc/i)
    expect(src).toContain('prenom')
  })

  it('UnitHierarchyNav: Nouvelle unité + expectedChildType + POST organization-units', () => {
    const src = readFileSync(join(PARAM, 'UnitHierarchyNav.tsx'), 'utf8')
    expect(src).toContain('expectedChildType')
    expect(src).toContain('Nouvelle unité')
    expect(src).toContain('/api/admin/organization-units')
    expect(src).toContain('parent_id')
    expect(src).toContain('unit_type')
    expect(src).toContain('canWrite')
  })

  it('UnitMembershipsTable: profil lisible + ConfirmAction + masquage', () => {
    const src = readFileSync(join(PARAM, 'UnitMembershipsTable.tsx'), 'utf8')
    expect(src).toContain('ConfirmAction')
    expect(src).toContain('canManageSubjectRole')
    expect(src).toContain('displayName')
    expect(src).toContain('profile')
    expect(src).toContain('actorUserId')
  })

  it('UnitInviteForm: 4 email_outcome + badges multi-status + revoke pending only', () => {
    const src = readFileSync(join(PARAM, 'UnitInviteForm.tsx'), 'utf8')
    expect(src).toContain('INVITATION_CREATED_EMAIL_SENT')
    expect(src).toContain('INVITATION_CREATED_EMAIL_PROVIDER_UNAVAILABLE')
    expect(src).toContain('INVITATION_CREATED_EMAIL_DELIVERY_FAILED')
    expect(src).toContain('INVITATION_CREATE_FAILED')
    expect(src).toContain("status === 'pending'")
    expect(src).toContain('ConfirmAction')
  })

  it('UnitGovernancePanel: MemberSearchSelect (plus d’input UUID nu seul)', () => {
    const src = readFileSync(join(PARAM, 'UnitGovernancePanel.tsx'), 'utf8')
    expect(src).toContain('MemberSearchSelect')
    expect(src).not.toMatch(/placeholder="user_id \(uuid profil\)"/)
  })
})

describe('Lot 6 UI — API contracts (source)', () => {
  it('invitations route mappe les 4 outcomes + pas de token dans JSON réponse', () => {
    const src = readFileSync(INV_ROUTE, 'utf8')
    const normalizedSrc = src.replace(/\r\n/g, '\n')
    expect(src).toContain('INVITATION_CREATED_EMAIL_SENT')
    expect(src).toContain('INVITATION_CREATED_EMAIL_PROVIDER_UNAVAILABLE')
    expect(src).toContain('INVITATION_CREATED_EMAIL_DELIVERY_FAILED')
    expect(src).toContain('INVITATION_CREATE_FAILED')
    expect(src).toContain('email_outcome')
    expect(src).toContain('message_fr')
    // Corps de réponse succès : invitation_id, expires_at, email_* — pas token
    const returnBlock = normalizedSrc.slice(
      normalizedSrc.lastIndexOf('return NextResponse.json({\n      ok: true'),
    )
    expect(returnBlock).toContain('invitation_id')
    expect(returnBlock).toContain('email_outcome')
    expect(returnBlock).not.toMatch(/token:\s*inv/)
    expect(returnBlock).not.toContain('token_hash')
  })

  it('listInvitationsForUnit: multi-status limit 50, sans token_hash', () => {
    const src = readFileSync(REPO, 'utf8')
    const listBody = src.slice(
      src.indexOf('export async function listInvitationsForUnit'),
      src.indexOf('export async function getInvitationByTokenHash'),
    )
    expect(listBody).toContain('.limit(50)')
    expect(listBody).not.toMatch(/\.eq\(\s*['"]status['"]/)
    expect(listBody).not.toContain('token_hash')
  })

  it('listMembershipsForUnit batch profiles (id, prenom, nom, email)', () => {
    const src = readFileSync(REPO, 'utf8')
    const memBody = src.slice(
      src.indexOf('export async function listMembershipsForUnit'),
      src.indexOf('export async function getMembershipById'),
    )
    expect(memBody).toContain("from('profiles')")
    expect(memBody).toContain('prenom')
    expect(memBody).toContain('nom')
    expect(memBody).toContain('email')
    expect(memBody).toMatch(/\.in\(\s*['"]id['"]/)
  })

  it('effective-permissions expose actorUserId', () => {
    const src = readFileSync(PERMS_ROUTE, 'utf8')
    expect(src).toContain('actorUserId')
    expect(src).toContain('guarded.userId')
  })
})

describe('Lot 6 UI — member search scope notes', () => {
  it('membres GET reste scopé acteur (q + pageSize, unit/world scope)', () => {
    const membresRoute = readFileSync(
      join(ROOT, 'src/app/api/admin/membres/route.ts'),
      'utf8',
    )
    expect(membresRoute).toContain("sp.get('q')")
    expect(membresRoute).toContain('pageSize')
    expect(membresRoute).toContain('listAccessibleUnitIds')
    expect(membresRoute).toContain('isWorldScope')
    // Note: MemberSearchSelect s’appuie sur ce scope — pas de fuite hors périmètre acteur.
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const getUser = vi.fn()
const rpc = vi.fn()

let memberResult: { data: unknown; error: unknown }
let retreatResult: { data: unknown; error: unknown }
let enrollmentResult: { data: unknown; error: unknown }

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  }
  return builder
}

const sessionSchema = {
  from: vi.fn((table: string) => {
    if (table === 'mahanaim_retreats') return query(retreatResult)
    if (table === 'mahanaim_retreat_enrollments') return query(enrollmentResult)
    throw new Error(`unexpected session table: ${table}`)
  }),
  rpc,
}

const adminSchema = {
  from: vi.fn((table: string) => {
    if (table === 'members') return query(memberResult)
    throw new Error(`unexpected admin table: ${table}`)
  }),
}

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: () => ({
    auth: { getUser },
    schema: () => sessionSchema,
  }),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { schema: () => adminSchema },
}))

import { getMemberRetreatBySlug } from './member-retreats-server'

const retreat = {
  id: 'retreat-1',
  event_id: 'event-1',
  slug: 'chambre-haute-2026',
  theme: 'Chambre haute',
  subtitle: null,
  scripture_reference: null,
  scripture_text: null,
  digital_description: null,
  hero_image_url: null,
  start_date: '2026-08-01',
  end_date: '2026-08-10',
  closing_date: null,
  daily_start_time: '08:00:00',
  timezone: 'Africa/Abidjan',
  digital_status: 'registration_open',
  access_type: 'member',
  is_featured: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null })
  memberResult = { data: { id: 'member-1' }, error: null }
  retreatResult = { data: retreat, error: null }
  enrollmentResult = { data: null, error: null }
  rpc.mockResolvedValue({ data: [], error: null })
})

describe('getMemberRetreatBySlug result contract', () => {
  it('returns identity_required instead of a false not_found when there is no authenticated user', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null }, error: null })

    await expect(getMemberRetreatBySlug('chambre-haute-2026')).resolves.toEqual({ status: 'identity_required' })
  })

  it('returns member_not_found when the authenticated identity has no member link', async () => {
    memberResult = { data: null, error: null }

    await expect(getMemberRetreatBySlug('chambre-haute-2026')).resolves.toEqual({ status: 'member_not_found' })
  })

  it('returns not_found only when the retreat is absent', async () => {
    retreatResult = { data: null, error: null }

    await expect(getMemberRetreatBySlug('chambre-haute-2026')).resolves.toEqual({ status: 'not_found' })
  })

  it.each([
    ['the retreat read', () => { retreatResult = { data: null, error: { message: 'read failed' } } }],
    ['the enrollment read', () => { enrollmentResult = { data: null, error: { message: 'RLS denied' } } }],
    ['the day catalog RPC', () => { enrollmentResult = { data: { id: 'enrollment-1' }, error: null }; rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } }) }],
  ])('returns unavailable when %s fails instead of hiding the failure as a 404', async (_name, arrange) => {
    arrange()

    await expect(getMemberRetreatBySlug('chambre-haute-2026')).resolves.toEqual({ status: 'unavailable' })
  })

  it('returns ok with the retreat for an authenticated linked member', async () => {
    await expect(getMemberRetreatBySlug('chambre-haute-2026')).resolves.toMatchObject({
      status: 'ok',
      retreat: { slug: 'chambre-haute-2026', enrolled: false, days: [] },
    })
  })
})

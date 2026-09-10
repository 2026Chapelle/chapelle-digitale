import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import {
  NextRequest,
} from 'next/server'

const mocks = vi.hoisted(() => ({
  isAdminRequest: vi.fn(),
  getVerifiedRouteProfile:
    vi.fn(),
  isAdminCapable: vi.fn(),
  getLiveAdminSupervision:
    vi.fn(),
}))

vi.mock('@/lib/admin-auth', () => ({
  isAdminRequest:
    mocks.isAdminRequest,
}))

vi.mock('@/lib/member-auth', () => ({
  getVerifiedRouteProfile:
    mocks.getVerifiedRouteProfile,
}))

vi.mock('@/lib/admin/admin-access', () => ({
  isAdminCapable:
    mocks.isAdminCapable,
}))

vi.mock('@/lib/live/live-admin-supervision-server', () => ({
  getLiveAdminSupervision:
    mocks.getLiveAdminSupervision,
}))

import {
  GET,
} from './route'

function request() {
  return new NextRequest(
    'https://citadelle.example/api/admin/live/supervision',
  )
}

const supervision = {
  live: true,
  canonical: {
    status: 'LIVE',
    title: 'Culte Royal',
    youtubeVideoId:
      'ABCDEFGHIJK',
  },
  presence: {
    available: true,
    activeTotal: 31,
    activeMembers: 22,
    activeGuests: 9,
    joinedTotal: 38,
  },
  shares: {
    available: true,
    totalActions: 7,
    nativeShare: 4,
    copyLink: 3,
  },
}

describe('LIVE 4A.6 admin supervision API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.isAdminRequest.mockReturnValue(
      true,
    )

    mocks.getVerifiedRouteProfile.mockResolvedValue(
      null,
    )

    mocks.isAdminCapable.mockReturnValue(
      true,
    )

    mocks.getLiveAdminSupervision.mockResolvedValue(
      supervision,
    )
  })

  it('requires the existing admin cookie guard', async () => {
    mocks.isAdminRequest.mockReturnValue(
      false,
    )

    const response =
      await GET(request())

    expect(response.status).toBe(401)

    expect(
      mocks.getLiveAdminSupervision,
    ).not.toHaveBeenCalled()

    expect(
      mocks.getVerifiedRouteProfile,
    ).not.toHaveBeenCalled()
  })

  it('keeps legacy admin access compatible when no nominative Supabase session exists', async () => {
    const response =
      await GET(request())

    expect(response.status).toBe(200)

    await expect(
      response.json(),
    ).resolves.toEqual({
      ok: true,
      data: supervision,
    })
  })

  it('rejects a nominative Supabase profile that is not admin-capable', async () => {
    mocks.getVerifiedRouteProfile.mockResolvedValue({
      uid:
        '11111111-1111-4111-8111-111111111111',
      role: 'membre',
    })

    mocks.isAdminCapable.mockReturnValue(
      false,
    )

    const response =
      await GET(request())

    expect(response.status).toBe(403)

    expect(
      mocks.isAdminCapable,
    ).toHaveBeenCalledWith(
      'membre',
    )

    expect(
      mocks.getLiveAdminSupervision,
    ).not.toHaveBeenCalled()
  })

  it('allows an admin-capable nominative profile', async () => {
    mocks.getVerifiedRouteProfile.mockResolvedValue({
      uid:
        '22222222-2222-4222-8222-222222222222',
      role: 'super_admin',
    })

    mocks.isAdminCapable.mockReturnValue(
      true,
    )

    const response =
      await GET(request())

    expect(response.status).toBe(200)

    expect(
      mocks.isAdminCapable,
    ).toHaveBeenCalledWith(
      'super_admin',
    )
  })

  it('never exposes raw participant identity fields', async () => {
    const response =
      await GET(request())

    const payload =
      await response.json()

    const raw =
      JSON.stringify(payload)

    expect(raw).not.toContain(
      'guest_session_hash',
    )

    expect(raw).not.toContain(
      'user_id',
    )

    expect(raw).not.toContain(
      'email',
    )

    expect(raw).not.toContain(
      'participant_id',
    )
  })

  it('marks successful responses no-store', async () => {
    const response =
      await GET(request())

    expect(
      response.headers.get(
        'cache-control',
      ),
    ).toContain('no-store')
  })

  it('returns additive aggregate reaction supervision without identities', async () => {
    mocks.isAdminRequest.mockReturnValue(
      true,
    )

    mocks.getLiveAdminSupervision.mockResolvedValue({
      live: true,
      canonical: {
        status: 'LIVE',
        title: 'Culte Royal',
        youtubeVideoId: 'ABCDEFGHIJK',
      },
      presence: {
        available: true,
        activeTotal: 31,
        activeMembers: 22,
        activeGuests: 9,
        joinedTotal: 38,
      },
      shares: {
        available: true,
        totalActions: 7,
        nativeShare: 4,
        copyLink: 3,
      },
      reactions: {
        available: true,
        total: 25,
      },
    })

    const {
      GET,
    } =
      await import(
        './route'
      )

    const response =
      await GET(
        request(),
      )

    expect(response.status).toBe(200)

    const payload =
      await response.json()

    expect(
      payload.data.reactions,
    ).toEqual({
      available: true,
      total: 25,
    })

    expect(
      JSON.stringify(
        payload.data.reactions,
      ),
    ).not.toMatch(
      /actor|user_id|guest_id|member_id|email|name/i,
    )
  })})
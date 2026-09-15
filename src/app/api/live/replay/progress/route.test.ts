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

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  save: vi.fn(),
  validId: vi.fn(),
  validSessionKey: vi.fn(),
}))

vi.mock(
  '@/lib/live/live-replay-progress-server',
  () => ({
    getReplayProgress:
      mocks.get,
    saveReplayProgress:
      mocks.save,
    validReplayProgressId:
      mocks.validId,
    validReplaySessionKey:
      mocks.validSessionKey,
  }),
)

vi.mock(
  '@/lib/site-url',
  () => ({
    SITE_URL:
      'https://citadelle.test',
  }),
)

import {
  POST,
} from './route'

const CMS_ID =
  '11111111-1111-4111-8111-111111111111'

const SESSION_KEY =
  '22222222-2222-4222-8222-222222222222'

const PAYLOAD = {
  cmsLiveId: CMS_ID,
  positionSeconds: 42,
  durationSeconds: 600,
  sessionKey: SESSION_KEY,
  sessionStart: true,
}

type PostOptions = {
  url?: string
  origin?: string | null
  secFetchSite?: string
}

function postRequest(
  options: PostOptions = {},
) {
  const headers =
    new Headers({
      'content-type':
        'application/json',
      'sec-fetch-site':
        options.secFetchSite ??
        'same-origin',
    })

  const origin =
    options.origin === undefined
      ? 'https://citadelle.test'
      : options.origin

  if (origin !== null) {
    headers.set(
      'origin',
      origin,
    )
  }

  return new NextRequest(
    options.url ??
      'http://127.0.0.1:3000/api/live/replay/progress',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(
        PAYLOAD,
      ),
    },
  )
}

describe(
  'LIVE 4C replay progress route',
  () => {
    beforeEach(() => {
      vi.clearAllMocks()

      mocks.validId
        .mockReturnValue(true)

      mocks.validSessionKey
        .mockReturnValue(true)

      mocks.save
        .mockResolvedValue({
          ok: true,
          progress: {
            cmsLiveId: CMS_ID,
            positionSeconds: 42,
            durationSeconds: 600,
          },
        })
    })

    it(
      'accepts the configured public Origin when the request URL carries an internal proxy origin',
      async () => {
        const response =
          await POST(
            postRequest(),
          )

        expect(
          response.status,
        ).toBe(200)

        expect(
          mocks.save,
        ).toHaveBeenCalledWith(
          PAYLOAD,
        )
      },
    )

    it.each([
      [
        'missing Origin',
        null,
        'same-origin',
      ],
      [
        'null Origin',
        'null',
        'same-origin',
      ],
      [
        'foreign Origin',
        'https://evil.test',
        'same-origin',
      ],
      [
        'cross-site metadata',
        'https://citadelle.test',
        'cross-site',
      ],
    ])(
      'rejects %s with 403',
      async (
        _label,
        origin,
        secFetchSite,
      ) => {
        const response =
          await POST(
            postRequest({
              origin,
              secFetchSite,
            }),
          )

        expect(
          response.status,
        ).toBe(403)

        await expect(
          response.json(),
        ).resolves.toEqual({
          ok: false,
          reason:
            'invalid_origin',
        })

        expect(
          mocks.save,
        ).not.toHaveBeenCalled()
      },
    )
  },
)

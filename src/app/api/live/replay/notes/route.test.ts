import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock(
  '@/lib/live/live-cult-notes-server',
  () => ({
    listMemberCultNotes:
      mocks.list,
    createMemberCultNote:
      mocks.create,
    updateMemberCultNote:
      mocks.update,
    deleteMemberCultNote:
      mocks.remove,
  }),
)

vi.mock(
  '@/lib/site-url',
  () => ({
    SITE_URL:
      'https://citadelle.test',
  }),
)

const CMS_ID =
  '11111111-1111-4111-8111-111111111111'

const NOTE_ID =
  '33333333-3333-4333-8333-333333333333'

const NOTE = {
  id: NOTE_ID,
  cmsLiveId: CMS_ID,
  kind: 'note',
  body: 'My note',
  positionSeconds: 42,
  scriptureReference: 'John 3:16',
  createdAt:
    '2026-09-14T12:00:00.000Z',
  updatedAt:
    '2026-09-14T12:00:00.000Z',
}

let subject:
  Record<string, any> = {}

beforeAll(async () => {
  const path = './route'

  try {
    subject =
      await import(
        /* @vite-ignore */ path
      )
  } catch {
    subject = {}
  }
})

beforeEach(() => {
  vi.clearAllMocks()

  mocks.list.mockResolvedValue({
    ok: true,
    notes: [NOTE],
  })

  mocks.create.mockResolvedValue({
    ok: true,
    note: NOTE,
  })

  mocks.update.mockResolvedValue({
    ok: true,
    note: {
      ...NOTE,
      kind: 'decision',
      body: 'Decision',
    },
  })

  mocks.remove.mockResolvedValue({
    ok: true,
  })
})

function routeMethod(
  name: string,
) {
  const value =
    subject[name]

  if (
    typeof value !== 'function'
  ) {
    expect(
      typeof value,
      `${name} must exist`,
    ).toBe('function')

    return null
  }

  return value as (
    request: Request,
  ) => Promise<Response>
}

function request(
  method: string,
  path = `/api/live/replay/notes?cmsLiveId=${CMS_ID}`,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  const init:
    RequestInit = {
      method,
      headers,
    }

  if (body !== undefined) {
    init.body =
      JSON.stringify(body)
  }

  return new Request(
    `https://citadelle.test${path}`,
    init,
  )
}

async function json(
  response: Response,
) {
  return response.json()
}

describe(
  'LIVE 4C private cult notes route',
  () => {
    it(
      'maps unauthenticated server result to 401',
      async () => {
        const GET =
          routeMethod('GET')

        if (!GET) return

        mocks.list.mockResolvedValue({
          ok: false,
          reason:
            'identity_required',
        })

        const response =
          await GET(
            request('GET'),
          )

        expect(
          response.status,
        ).toBe(401)

        await expect(
          json(response),
        ).resolves.toEqual({
          ok: false,
          reason:
            'identity_required',
        })
      },
    )

    it(
      'rejects bad GET UUID with 400 before delegation',
      async () => {
        const GET =
          routeMethod('GET')

        if (!GET) return

        const response =
          await GET(
            request(
              'GET',
              '/api/live/replay/notes?cmsLiveId=bad-id',
            ),
          )

        expect(
          response.status,
        ).toBe(400)

        expect(
          mocks.list,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects cross-site mutation with 403',
      async () => {
        const POST =
          routeMethod('POST')

        if (!POST) return

        const response =
          await POST(
            request(
              'POST',
              '/api/live/replay/notes',
              {
                id: NOTE_ID,
                cmsLiveId: CMS_ID,
                kind: 'note',
                body: 'My note',
                positionSeconds: 42,
                scriptureReference:
                  null,
              },
              {
                'content-type':
                  'application/json',
                origin:
                  'https://evil.test',
                'sec-fetch-site':
                  'cross-site',
              },
            ),
          )

        expect(
          response.status,
        ).toBe(403)

        expect(
          mocks.create,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'rejects wrong mutation content-type with 400',
      async () => {
        const POST =
          routeMethod('POST')

        if (!POST) return

        const response =
          await POST(
            request(
              'POST',
              '/api/live/replay/notes',
              {
                id: NOTE_ID,
                cmsLiveId: CMS_ID,
                kind: 'note',
                body: 'My note',
                positionSeconds: 42,
                scriptureReference:
                  null,
              },
              {
                origin:
                  'https://citadelle.test',
                'sec-fetch-site':
                  'same-origin',
                'content-type':
                  'text/plain',
              },
            ),
          )

        expect(
          response.status,
        ).toBe(400)

        expect(
          mocks.create,
        ).not.toHaveBeenCalled()
      },
    )

    it.each([
      ['userId', 'client-user'],
      ['user_id', 'client-user'],
    ])(
      'rejects forbidden identity field %s',
      async (
        key,
        value,
      ) => {
        const POST =
          routeMethod('POST')

        if (!POST) return

        const body:
          Record<string, unknown> = {
            id: NOTE_ID,
            cmsLiveId: CMS_ID,
            kind: 'note',
            body: 'My note',
            positionSeconds: 42,
            scriptureReference:
              null,
          }

        body[key] = value

        const response =
          await POST(
            request(
              'POST',
              '/api/live/replay/notes',
              body,
              {
                origin:
                  'https://citadelle.test',
                'sec-fetch-site':
                  'same-origin',
                'content-type':
                  'application/json',
              },
            ),
          )

        expect(
          response.status,
        ).toBe(400)

        expect(
          mocks.create,
        ).not.toHaveBeenCalled()
      },
    )

    it.each([
      {
        kind: 'invalid-kind',
        body: 'My note',
        positionSeconds: 42,
        scriptureReference:
          null,
      },
      {
        kind: 'note',
        body: '   ',
        positionSeconds: 42,
        scriptureReference:
          null,
      },
      {
        kind: 'note',
        body: 'My note',
        positionSeconds: -1,
        scriptureReference:
          null,
      },
      {
        kind: 'note',
        body: 'My note',
        positionSeconds: 42,
        scriptureReference:
          'x'.repeat(201),
      },
    ])(
      'rejects invalid POST domain input',
      async fields => {
        const POST =
          routeMethod('POST')

        if (!POST) return

        const response =
          await POST(
            request(
              'POST',
              '/api/live/replay/notes',
              {
                id: NOTE_ID,
                cmsLiveId: CMS_ID,
                ...fields,
              },
              {
                origin:
                  'https://citadelle.test',
                'sec-fetch-site':
                  'same-origin',
                'content-type':
                  'application/json',
              },
            ),
          )

        expect(
          response.status,
        ).toBe(400)

        expect(
          mocks.create,
        ).not.toHaveBeenCalled()
      },
    )

    it(
      'delegates valid GET',
      async () => {
        const GET =
          routeMethod('GET')

        if (!GET) return

        const response =
          await GET(
            request('GET'),
          )

        expect(
          mocks.list,
        ).toHaveBeenCalledWith(
          CMS_ID,
        )

        expect(
          response.status,
        ).toBe(200)

        await expect(
          json(response),
        ).resolves.toEqual({
          ok: true,
          notes: [NOTE],
        })
      },
    )

    it(
      'delegates valid POST',
      async () => {
        const POST =
          routeMethod('POST')

        if (!POST) return

        const input = {
          id: NOTE_ID,
          cmsLiveId: CMS_ID,
          kind: 'note',
          body: 'My note',
          positionSeconds: 42,
          scriptureReference:
            'John 3:16',
        }

        const response =
          await POST(
            request(
              'POST',
              '/api/live/replay/notes',
              input,
              {
                origin:
                  'https://citadelle.test',
                'sec-fetch-site':
                  'same-origin',
                'content-type':
                  'application/json',
              },
            ),
          )

        expect(
          mocks.create,
        ).toHaveBeenCalledWith(
          input,
        )

        expect(
          response.status,
        ).toBe(200)
      },
    )

    it(
      'delegates valid PATCH',
      async () => {
        const PATCH =
          routeMethod('PATCH')

        if (!PATCH) return

        const input = {
          id: NOTE_ID,
          cmsLiveId: CMS_ID,
          kind: 'decision',
          body: 'Decision',
          scriptureReference:
            null,
        }

        const response =
          await PATCH(
            request(
              'PATCH',
              '/api/live/replay/notes',
              input,
              {
                origin:
                  'https://citadelle.test',
                'sec-fetch-site':
                  'same-origin',
                'content-type':
                  'application/json',
              },
            ),
          )

        expect(
          mocks.update,
        ).toHaveBeenCalledWith(
          input,
        )

        expect(
          response.status,
        ).toBe(200)
      },
    )

    it(
      'delegates valid DELETE',
      async () => {
        const DELETE =
          routeMethod('DELETE')

        if (!DELETE) return

        const response =
          await DELETE(
            request(
              'DELETE',
              '/api/live/replay/notes',
              {
                id: NOTE_ID,
                cmsLiveId: CMS_ID,
              },
              {
                origin:
                  'https://citadelle.test',
                'sec-fetch-site':
                  'same-origin',
                'content-type':
                  'application/json',
              },
            ),
          )

        expect(
          mocks.remove,
        ).toHaveBeenCalledWith(
          CMS_ID,
          NOTE_ID,
        )

        expect(
          response.status,
        ).toBe(200)

        await expect(
          json(response),
        ).resolves.toEqual({
          ok: true,
        })
      },
    )

    it(
      'accepts the configured public Origin when the request URL carries an internal proxy origin',
      async () => {
        const POST =
          routeMethod('POST')

        if (!POST) return

        const response =
          await POST(
            new Request(
              'http://127.0.0.1:3000/api/live/replay/notes',
              {
                method: 'POST',
                headers: {
                  'content-type':
                    'application/json',
                  origin:
                    'https://citadelle.test',
                  'sec-fetch-site':
                    'same-origin',
                },
                body: JSON.stringify({
                  id: NOTE_ID,
                  cmsLiveId: CMS_ID,
                  kind: 'note',
                  body: 'My note',
                  positionSeconds: 42,
                  scriptureReference:
                    null,
                }),
              },
            ),
          )

        expect(
          response.status,
        ).toBe(200)

        expect(
          mocks.create,
        ).toHaveBeenCalledWith({
          id: NOTE_ID,
          cmsLiveId: CMS_ID,
          kind: 'note',
          body: 'My note',
          positionSeconds: 42,
          scriptureReference:
            null,
        })
      },
    )

    it(
      'maps unavailable to 503',
      async () => {
        const GET =
          routeMethod('GET')

        if (!GET) return

        mocks.list.mockResolvedValue({
          ok: false,
          reason: 'unavailable',
        })

        const response =
          await GET(
            request('GET'),
          )

        expect(
          response.status,
        ).toBe(503)

        await expect(
          json(response),
        ).resolves.toEqual({
          ok: false,
          reason: 'unavailable',
        })
      },
    )
  },
)
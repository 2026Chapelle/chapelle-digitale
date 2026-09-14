import {
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

type Subject = Record<string, any>

let subject: Subject = {}

const CMS_ID =
  '11111111-1111-4111-8111-111111111111'

const USER_ID =
  '22222222-2222-4222-8222-222222222222'

class MemoryStorage {
  private data =
    new Map<string, string>()

  getItem(key: string) {
    return this.data.has(key)
      ? this.data.get(key) !!
      : null
  }

  setItem(
    key: string,
    value: string,
  ) {
    this.data.set(key, value)
  }

  removeItem(key: string) {
    this.data.delete(key)
  }

  clear() {
    this.data.clear()
  }
}

const storage =
  new MemoryStorage()

beforeAll(async () => {
  Object.defineProperty(
    globalThis,
    'localStorage',
    {
      value: storage,
      configurable: true,
    },
  )

  const modulePath =
    './live-cult-notes-client'

  subject =
    await import(
      /* @vite-ignore */
      modulePath
    ).catch(() => ({}))
})

beforeEach(() => {
  storage.clear()
})

describe('LIVE 4C cult notebook local-first', () => {
  it('isolates guest and member storage keys', () => {
    expect(
      typeof subject.cultNoteStorageKey,
    ).toBe('function')

    expect(
      subject.cultNoteStorageKey(
        'guest',
        CMS_ID,
      ),
    ).toBe(
      `citadelle_live_cult_notes_v1:guest:${CMS_ID}`,
    )

    expect(
      subject.cultNoteStorageKey(
        `member:${USER_ID}`,
        CMS_ID,
      ),
    ).toBe(
      `citadelle_live_cult_notes_v1:member:${USER_ID}:${CMS_ID}`,
    )
  })

  it('returns an empty list for invalid local JSON', () => {
    const key =
      `citadelle_live_cult_notes_v1:guest:${CMS_ID}`

    storage.setItem(key, '{bad json')

    expect(
      typeof subject.readLocalCultNotes,
    ).toBe('function')

    expect(
      subject.readLocalCultNotes(
        'guest',
        CMS_ID,
      ),
    ).toEqual([])
  })

  it('creates notes inside the requested scope only', () => {
    expect(
      typeof subject.createLocalCultNote,
    ).toBe('function')

    subject.createLocalCultNote(
      'guest',
      {
        id: '33333333-3333-4333-8333-333333333333',
        cmsLiveId: CMS_ID,
        kind: 'note',
        body: 'Private guest note',
        positionSeconds: 12,
        scriptureReference: null,
      },
      '2026-09-14T08:00:00.000Z',
    )

    expect(
      subject.readLocalCultNotes(
        'guest',
        CMS_ID,
      ),
    ).toHaveLength(1)

    expect(
      subject.readLocalCultNotes(
        `member:${USER_ID}`,
        CMS_ID,
      ),
    ).toEqual([])
  })

  it('updates and deletes without cross-scope mutation', () => {
    const id =
      '44444444-4444-4444-8444-444444444444'

    subject.createLocalCultNote(
      'guest',
      {
        id,
        cmsLiveId: CMS_ID,
        kind: 'note',
        body: 'Before',
        positionSeconds: 1,
        scriptureReference: null,
      },
      '2026-09-14T08:00:00.000Z',
    )

    subject.createLocalCultNote(
      `member:${USER_ID}`,
      {
        id,
        cmsLiveId: CMS_ID,
        kind: 'note',
        body: 'Member copy',
        positionSeconds: 2,
        scriptureReference: null,
      },
      '2026-09-14T08:00:01.000Z',
    )

    subject.updateLocalCultNote(
      'guest',
      CMS_ID,
      id,
      { body: 'After' },
      '2026-09-14T08:00:02.000Z',
    )

    expect(
      subject.readLocalCultNotes(
        'guest',
        CMS_ID,
      )[0].body,
    ).toBe('After')

    expect(
      subject.readLocalCultNotes(
        `member:${USER_ID}`,
        CMS_ID,
      )[0].body,
    ).toBe('Member copy')

    subject.deleteLocalCultNote(
      'guest',
      CMS_ID,
      id,
    )

    expect(
      subject.readLocalCultNotes(
        'guest',
        CMS_ID,
      ),
    ).toEqual([])

    expect(
      subject.readLocalCultNotes(
        `member:${USER_ID}`,
        CMS_ID,
      ),
    ).toHaveLength(1)
  })

  it('merges by id using newest updatedAt and sorts deterministically', () => {
    expect(
      typeof subject.mergeCultNotes,
    ).toBe('function')

    const local = [
      {
        id: '55555555-5555-4555-8555-555555555555',
        cmsLiveId: CMS_ID,
        kind: 'note',
        body: 'Local newer',
        positionSeconds: 3,
        scriptureReference: null,
        createdAt: '2026-09-14T08:00:00.000Z',
        updatedAt: '2026-09-14T08:00:05.000Z',
      },
    ]

    const server = [
      {
        ...local[0],
        body: 'Server older',
        updatedAt: '2026-09-14T08:00:03.000Z',
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        cmsLiveId: CMS_ID,
        kind: 'decision',
        body: 'Server only',
        positionSeconds: 4,
        scriptureReference: null,
        createdAt: '2026-09-14T08:00:01.000Z',
        updatedAt: '2026-09-14T08:00:04.000Z',
      },
    ]

    const merged =
      subject.mergeCultNotes(
        local,
        server,
      )

    expect(
      merged.map((x: any) => x.body),
    ).toEqual([
      'Local newer',
      'Server only',
    ])
  })
})

describe('LIVE 4C cult notebook member identity', () => {
  it('resolves only a valid authenticated member scope', async () => {
    expect(
      typeof subject.getAuthenticatedCultNoteScope,
    ).toBe('function')

    const { supabase } =
      await import('../supabase')

    const getUser =
      vi.spyOn(supabase.auth, 'getUser')

    try {
      getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: USER_ID,
          } as any,
        },
        error: null,
      } as any)

      await expect(
        subject.getAuthenticatedCultNoteScope(),
      ).resolves.toBe(
        `member:${USER_ID}`,
      )

      getUser.mockResolvedValueOnce({
        data: {
          user: null,
        },
        error: null,
      } as any)

      await expect(
        subject.getAuthenticatedCultNoteScope(),
      ).resolves.toBeNull()
    } finally {
      getUser.mockRestore()
    }
  })
})

describe('LIVE 4C cult notebook server API client', () => {
  const note = {
    id: '77777777-7777-4777-8777-777777777777',
    cmsLiveId: CMS_ID,
    kind: 'note',
    body: 'Server note',
    positionSeconds: 8,
    scriptureReference: null,
    createdAt: '2026-09-14T08:00:00.000Z',
    updatedAt: '2026-09-14T08:00:00.000Z',
  }

  it('gets notes through same-origin no-store', async () => {
    expect(typeof subject.getServerCultNotes).toBe('function')

    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ ok: true, notes: [note] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetcher)

    try {
      const result = await subject.getServerCultNotes(CMS_ID)

      expect(result).toEqual({ ok: true, notes: [note] })
      expect(fetcher).toHaveBeenCalledTimes(1)

      const [url, init] = fetcher.mock.calls[0]
      expect(String(url)).toBe(
        `/api/live/replay/notes?cmsLiveId=${CMS_ID}`,
      )
      expect(init).toMatchObject({
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('posts a note without any client-owned user id', async () => {
    expect(typeof subject.createServerCultNote).toBe('function')

    const input = {
      id: '88888888-8888-4888-8888-888888888888',
      cmsLiveId: CMS_ID,
      kind: 'received_word',
      body: 'Parole reçue',
      positionSeconds: 15,
      scriptureReference: 'Jean 3:16',
    }

    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({
        ok: true,
        note: {
          ...input,
          createdAt: '2026-09-14T08:00:00.000Z',
          updatedAt: '2026-09-14T08:00:00.000Z',
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetcher)

    try {
      const result = await subject.createServerCultNote(input)
      expect(result.ok).toBe(true)

      const [url, init] = fetcher.mock.calls[0]
      expect(url).toBe('/api/live/replay/notes')
      expect(init).toMatchObject({
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      })

      const body = JSON.parse(String(init?.body))
      expect(body).toEqual(input)
      expect(body).not.toHaveProperty('userId')
      expect(body).not.toHaveProperty('user_id')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('uses PATCH and DELETE with same-origin JSON bodies', async () => {
    expect(typeof subject.updateServerCultNote).toBe('function')
    expect(typeof subject.deleteServerCultNote).toBe('function')

    const id = '99999999-9999-4999-8999-999999999999'

    const fetcher = vi.fn(async (_url: unknown, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ ok: true, note }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    vi.stubGlobal('fetch', fetcher)

    try {
      await subject.updateServerCultNote({
        id,
        cmsLiveId: CMS_ID,
        kind: 'decision',
        body: 'Décision',
        scriptureReference: null,
      })

      await subject.deleteServerCultNote(CMS_ID, id)

      expect(fetcher).toHaveBeenCalledTimes(2)

      const [, patchInit] = fetcher.mock.calls[0]
      const [, deleteInit] = fetcher.mock.calls[1]

      expect(patchInit).toMatchObject({
        method: 'PATCH',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      })
      expect(JSON.parse(String(patchInit?.body))).toEqual({
        id,
        cmsLiveId: CMS_ID,
        kind: 'decision',
        body: 'Décision',
        scriptureReference: null,
      })

      expect(deleteInit).toMatchObject({
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
      })
      expect(JSON.parse(String(deleteInit?.body))).toEqual({
        id,
        cmsLiveId: CMS_ID,
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('maps 401 and network failure to stable client results', async () => {
    expect(typeof subject.getServerCultNotes).toBe('function')

    const unauthorized = vi.fn(async () =>
      new Response(JSON.stringify({ ok: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', unauthorized)

    try {
      await expect(
        subject.getServerCultNotes(CMS_ID),
      ).resolves.toEqual({
        ok: false,
        reason: 'identity_required',
      })
    } finally {
      vi.unstubAllGlobals()
    }

    const broken = vi.fn(async () => {
      throw new Error('network down')
    })

    vi.stubGlobal('fetch', broken)

    try {
      await expect(
        subject.getServerCultNotes(CMS_ID),
      ).resolves.toEqual({
        ok: false,
        reason: 'unavailable',
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

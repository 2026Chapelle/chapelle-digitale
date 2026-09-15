import {
  validCultNoteUuid,
  type LiveCultNote,
  type LiveCultNoteKind,
  type LiveCultNoteWrite,
} from './live-cult-notes'

import { supabase } from '../supabase'

export type CultNoteLocalScope =
  | 'guest'
  | `member:${string}`

type CultNotePatch = Partial<
  Pick<
    LiveCultNoteWrite,
    | 'kind'
    | 'body'
    | 'positionSeconds'
    | 'scriptureReference'
  >
>

const STORAGE_PREFIX =
  'citadelle_live_cult_notes_v1:'

function storageOrNull() {
  try {
    if (typeof localStorage === 'undefined') {
      return null
    }

    return localStorage
  } catch {
    return null
  }
}

function sortCultNotes(
  notes: LiveCultNote[],
): LiveCultNote[] {
  return [...notes].sort((a, b) => {
    const created =
      a.createdAt.localeCompare(
        b.createdAt,
      )

    if (created !== 0) {
      return created
    }

    return a.id.localeCompare(b.id)
  })
}

function isCultNoteKind(
  value: unknown,
): value is LiveCultNoteKind {
  return (
    value === 'note' ||
    value === 'received_word' ||
    value === 'scripture' ||
    value === 'decision' ||
    value === 'meditation'
  )
}

function isStoredCultNote(
  value: unknown,
  cmsLiveId: string,
): value is LiveCultNote {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    return false
  }

  const note =
    value as Record<string, unknown>

  return (
    typeof note.id === 'string' &&
    note.cmsLiveId === cmsLiveId &&
    isCultNoteKind(note.kind) &&
    typeof note.body === 'string' &&
    (
      note.positionSeconds === null ||
      (
        typeof note.positionSeconds ===
          'number' &&
        Number.isFinite(
          note.positionSeconds,
        ) &&
        note.positionSeconds >= 0
      )
    ) &&
    (
      note.scriptureReference === null ||
      typeof note.scriptureReference ===
        'string'
    ) &&
    typeof note.createdAt === 'string' &&
    typeof note.updatedAt === 'string'
  )
}

export function cultNoteStorageKey(
  scope: CultNoteLocalScope,
  cmsLiveId: string,
) {
  return (
    `${STORAGE_PREFIX}${scope}:` +
    cmsLiveId
  )
}

export function readLocalCultNotes(
  scope: CultNoteLocalScope,
  cmsLiveId: string,
): LiveCultNote[] {
  const storage =
    storageOrNull()

  if (!storage) {
    return []
  }

  try {
    const raw =
      storage.getItem(
        cultNoteStorageKey(
          scope,
          cmsLiveId,
        ),
      )

    if (!raw) {
      return []
    }

    const parsed =
      JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return sortCultNotes(
      parsed.filter(
        (note): note is LiveCultNote =>
          isStoredCultNote(
            note,
            cmsLiveId,
          ),
      ),
    )
  } catch {
    return []
  }
}

export function writeLocalCultNotes(
  scope: CultNoteLocalScope,
  cmsLiveId: string,
  notes: LiveCultNote[],
): boolean {
  const storage =
    storageOrNull()

  if (!storage) {
    return false
  }

  try {
    storage.setItem(
      cultNoteStorageKey(
        scope,
        cmsLiveId,
      ),
      JSON.stringify(
        sortCultNotes(notes),
      ),
    )

    return true
  } catch {
    return false
  }
}

export function createLocalCultNote(
  scope: CultNoteLocalScope,
  write: LiveCultNoteWrite,
  nowIso = new Date().toISOString(),
): LiveCultNote {
  const note: LiveCultNote = {
    ...write,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  const notes =
    readLocalCultNotes(
      scope,
      write.cmsLiveId,
    ).filter(
      existing =>
        existing.id !== write.id,
    )

  writeLocalCultNotes(
    scope,
    write.cmsLiveId,
    [...notes, note],
  )

  return note
}

export function updateLocalCultNote(
  scope: CultNoteLocalScope,
  cmsLiveId: string,
  id: string,
  patch: CultNotePatch,
  nowIso = new Date().toISOString(),
): LiveCultNote | null {
  let updated:
    | LiveCultNote
    | null = null

  const notes =
    readLocalCultNotes(
      scope,
      cmsLiveId,
    ).map(note => {
      if (note.id !== id) {
        return note
      }

      updated = {
        ...note,
        ...patch,
        id: note.id,
        cmsLiveId: note.cmsLiveId,
        createdAt: note.createdAt,
        updatedAt: nowIso,
      }

      return updated
    })

  if (!updated) {
    return null
  }

  writeLocalCultNotes(
    scope,
    cmsLiveId,
    notes,
  )

  return updated
}

export function deleteLocalCultNote(
  scope: CultNoteLocalScope,
  cmsLiveId: string,
  id: string,
): boolean {
  const notes =
    readLocalCultNotes(
      scope,
      cmsLiveId,
    )

  const remaining =
    notes.filter(
      note => note.id !== id,
    )

  if (
    remaining.length ===
    notes.length
  ) {
    return false
  }

  return writeLocalCultNotes(
    scope,
    cmsLiveId,
    remaining,
  )
}

export function mergeCultNotes(
  local: LiveCultNote[],
  server: LiveCultNote[],
): LiveCultNote[] {
  const byId =
    new Map<string, LiveCultNote>()

  for (const note of server) {
    byId.set(note.id, note)
  }

  for (const note of local) {
    const current =
      byId.get(note.id)

    if (
      !current ||
      note.updatedAt >=
        current.updatedAt
    ) {
      byId.set(note.id, note)
    }
  }

  return sortCultNotes(
    Array.from(byId.values()),
  )
}


export async function getAuthenticatedCultNoteScope():
  Promise<CultNoteLocalScope | null> {
  try {
    const {
      data: { user },
      error,
  } = await supabase.auth.getUser()

    if (
      error ||
      !user ||
      !validCultNoteUuid(user.id)
    ) {
      return null
    }

    return `member:${user.id}`
  } catch {
    return null
  }
}

const CULT_NOTES_API_PATH =
  '/api/live/replay/notes'

export type CultNotesServerResult =
  | {
      ok: true
      notes: LiveCultNote[]
    }
  | {
      ok: false
      reason:
        | 'identity_required'
        | 'unavailable'
    }

export type CultNoteServerResult =
  | {
      ok: true
      note: LiveCultNote
    }
  | {
      ok: false
      reason:
        | 'identity_required'
        | 'unavailable'
    }

export type CultNoteDeleteServerResult =
  | {
      ok: true
    }
  | {
      ok: false
      reason:
        | 'identity_required'
        | 'unavailable'
    }

export type LiveCultNoteUpdate = {
  id: string
  cmsLiveId: string
  kind?: LiveCultNoteKind
  body?: string
  positionSeconds?: number | null
  scriptureReference?: string | null
}

function serverFailure(
  status: number,
): {
  ok: false
  reason:
    | 'identity_required'
    | 'unavailable'
} {
  return {
    ok: false,
    reason:
      status === 401
        ? 'identity_required'
        : 'unavailable',
  }
}

async function responseJson(
  response: Response,
): Promise<Record<string, any> | null> {
  return response
    .json()
    .catch(() => null)
}

export async function getServerCultNotes(
  cmsLiveId: string,
): Promise<CultNotesServerResult> {
  try {
    const params =
      new URLSearchParams({
        cmsLiveId,
      })

    const response =
      await fetch(
        `${CULT_NOTES_API_PATH}?${params}`,
        {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        },
      )

    if (!response.ok) {
      return serverFailure(
        response.status,
      )
    }

    const body =
      await responseJson(response)

    if (
      !body?.ok ||
      !Array.isArray(body.notes)
    ) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    const notes =
      body.notes.filter(
        (note): note is LiveCultNote =>
          isStoredCultNote(
            note,
            cmsLiveId,
          ),
      )

    if (notes.length !== body.notes.length) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      notes: sortCultNotes(notes),
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function createServerCultNote(
  input: LiveCultNoteWrite,
): Promise<CultNoteServerResult> {
  try {
    const response =
      await fetch(
        CULT_NOTES_API_PATH,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(input),
        },
      )

    if (!response.ok) {
      return serverFailure(
        response.status,
      )
    }

    const body =
      await responseJson(response)

    if (
      !body?.ok ||
      !isStoredCultNote(
        body.note,
        input.cmsLiveId,
      )
    ) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      note: body.note,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function updateServerCultNote(
  input: LiveCultNoteUpdate,
): Promise<CultNoteServerResult> {
  try {
    const response =
      await fetch(
        CULT_NOTES_API_PATH,
        {
          method: 'PATCH',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(input),
        },
      )

    if (!response.ok) {
      return serverFailure(
        response.status,
      )
    }

    const body =
      await responseJson(response)

    if (
      !body?.ok ||
      !isStoredCultNote(
        body.note,
        input.cmsLiveId,
      )
    ) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      note: body.note,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export async function deleteServerCultNote(
  cmsLiveId: string,
  id: string,
): Promise<CultNoteDeleteServerResult> {
  try {
    const response =
      await fetch(
        CULT_NOTES_API_PATH,
        {
          method: 'DELETE',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id,
            cmsLiveId,
          }),
        },
      )

    if (!response.ok) {
      return serverFailure(
        response.status,
      )
    }

    const body =
      await responseJson(response)

    if (!body?.ok) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

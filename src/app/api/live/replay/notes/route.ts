import {
  NextResponse,
} from 'next/server'

import {
  LIVE_CULT_NOTE_KINDS,
  validCultNoteUuid,
} from '@/lib/live/live-cult-notes'

import {
  createMemberCultNote,
  deleteMemberCultNote,
  listMemberCultNotes,
  updateMemberCultNote,
} from '@/lib/live/live-cult-notes-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store, max-age=0',
      },
    },
  )
}

function failure(
  reason: string,
) {
  if (
    reason ===
    'identity_required'
  ) {
    return json(
      {
        ok: false,
        reason,
      },
      401,
    )
  }

  if (
    reason ===
    'invalid_request'
  ) {
    return json(
      {
        ok: false,
        reason,
      },
      400,
    )
  }

  if (
    reason ===
    'not_found'
  ) {
    return json(
      {
        ok: false,
        reason,
      },
      404,
    )
  }

  return json(
    {
      ok: false,
      reason: 'unavailable',
    },
    503,
  )
}

function invalidRequest() {
  return json(
    {
      ok: false,
      reason: 'invalid_request',
    },
    400,
  )
}

function sameOrigin(
  request: Request,
): boolean {
  const secFetchSite =
    request.headers
      .get('sec-fetch-site')
      ?.toLowerCase()

  if (
    secFetchSite ===
    'cross-site'
  ) {
    return false
  }

  const origin =
    request.headers.get(
      'origin',
    )

  if (
    !origin ||
    origin === 'null'
  ) {
    return false
  }

  try {
    return (
      new URL(origin).origin ===
      new URL(
        request.url,
      ).origin
    )
  } catch {
    return false
  }
}

function hasJsonContentType(
  request: Request,
) {
  const contentType =
    request.headers
      .get('content-type')
      ?.toLowerCase() ?? ''

  return contentType.startsWith(
    'application/json',
  )
}

async function readJsonObject(
  request: Request,
): Promise<
  Record<string, unknown> | null
> {
  try {
    const body =
      await request.json()

    if (
      !body ||
      typeof body !==
        'object' ||
      Array.isArray(body)
    ) {
      return null
    }

    return body as Record<
      string,
      unknown
    >
  } catch {
    return null
  }
}

function hasOnlyKeys(
  row: Record<string, unknown>,
  allowed: readonly string[],
) {
  const set =
    new Set(allowed)

  return !Object.keys(row)
    .some(
      key =>
        !set.has(key),
    )
}

function validKind(
  value: unknown,
): boolean {
  return (
    typeof value ===
      'string' &&
    (
      LIVE_CULT_NOTE_KINDS as
        readonly string[]
    ).includes(value)
  )
}

function validBody(
  value: unknown,
): value is string {
  if (
    typeof value !==
    'string'
  ) {
    return false
  }

  const length =
    value.trim().length

  return (
    length >= 1 &&
    length <= 10000
  )
}

function validPosition(
  value: unknown,
): boolean {
  return (
    value === null ||
    (
      typeof value ===
        'number' &&
      Number.isFinite(value) &&
      Number.isInteger(value) &&
      value >= 0
    )
  )
}

function validReference(
  value: unknown,
): boolean {
  return (
    value === null ||
    (
      typeof value ===
        'string' &&
      value.length <= 200
    )
  )
}

function mutationGate(
  request: Request,
) {
  if (!sameOrigin(request)) {
    return json(
      {
        ok: false,
        reason:
          'invalid_origin',
      },
      403,
    )
  }

  if (
    !hasJsonContentType(
      request,
    )
  ) {
    return invalidRequest()
  }

  return null
}

export async function GET(
  request: Request,
) {
  let url: URL

  try {
    url =
      new URL(request.url)
  } catch {
    return invalidRequest()
  }

  const params =
    url.searchParams

  const keys =
    Array.from(
      params.keys(),
    )

  const values =
    params.getAll(
      'cmsLiveId',
    )

  if (
    keys.length !== 1 ||
    keys[0] !==
      'cmsLiveId' ||
    values.length !== 1 ||
    !validCultNoteUuid(
      values[0],
    )
  ) {
    return invalidRequest()
  }

  const result =
    await listMemberCultNotes(
      values[0],
    )

  if (!result.ok) {
    return failure(
      result.reason,
    )
  }

  return json({
    ok: true,
    notes: result.notes,
  })
}

export async function POST(
  request: Request,
) {
  const gated =
    mutationGate(request)

  if (gated) return gated

  const row =
    await readJsonObject(
      request,
    )

  if (!row) {
    return invalidRequest()
  }

  const allowedKeys = [
    'id',
    'cmsLiveId',
    'kind',
    'body',
    'positionSeconds',
    'scriptureReference',
  ] as const

  if (
    !hasOnlyKeys(
      row,
      allowedKeys,
    ) ||
    !validCultNoteUuid(
      row.id,
    ) ||
    !validCultNoteUuid(
      row.cmsLiveId,
    ) ||
    !validKind(
      row.kind,
    ) ||
    !validBody(
      row.body,
    ) ||
    !validPosition(
      row.positionSeconds,
    ) ||
    !validReference(
      row.scriptureReference,
    )
  ) {
    return invalidRequest()
  }

  const result =
    await createMemberCultNote({
      id: row.id,
      cmsLiveId:
        row.cmsLiveId,
      kind:
        row.kind as any,
      body: row.body,
      positionSeconds:
        row.positionSeconds as
          number | null,
      scriptureReference:
        row.scriptureReference as
          string | null,
    })

  if (!result.ok) {
    return failure(
      result.reason,
    )
  }

  return json({
    ok: true,
    note: result.note,
  })
}

export async function PATCH(
  request: Request,
) {
  const gated =
    mutationGate(request)

  if (gated) return gated

  const row =
    await readJsonObject(
      request,
    )

  if (!row) {
    return invalidRequest()
  }

  const allowedKeys = [
    'id',
    'cmsLiveId',
    'kind',
    'body',
    'scriptureReference',
  ] as const

  if (
    !hasOnlyKeys(
      row,
      allowedKeys,
    ) ||
    !validCultNoteUuid(
      row.id,
    ) ||
    !validCultNoteUuid(
      row.cmsLiveId,
    )
  ) {
    return invalidRequest()
  }

  const hasKind =
    Object.prototype
      .hasOwnProperty.call(
        row,
        'kind',
      )

  const hasBody =
    Object.prototype
      .hasOwnProperty.call(
        row,
        'body',
      )

  const hasReference =
    Object.prototype
      .hasOwnProperty.call(
        row,
        'scriptureReference',
      )

  if (
    !hasKind &&
    !hasBody &&
    !hasReference
  ) {
    return invalidRequest()
  }

  if (
    hasKind &&
    !validKind(row.kind)
  ) {
    return invalidRequest()
  }

  if (
    hasBody &&
    !validBody(row.body)
  ) {
    return invalidRequest()
  }

  if (
    hasReference &&
    !validReference(
      row.scriptureReference,
    )
  ) {
    return invalidRequest()
  }

  const input: {
    id: string
    cmsLiveId: string
    kind?: any
    body?: string
    scriptureReference?:
      string | null
  } = {
    id: row.id,
    cmsLiveId:
      row.cmsLiveId,
  }

  if (hasKind) {
    input.kind =
      row.kind
  }

  if (hasBody) {
    input.body =
      row.body as string
  }

  if (hasReference) {
    input.scriptureReference =
      row.scriptureReference as
        string | null
  }

  const result =
    await updateMemberCultNote(
      input,
    )

  if (!result.ok) {
    return failure(
      result.reason,
    )
  }

  return json({
    ok: true,
    note: result.note,
  })
}

export async function DELETE(
  request: Request,
) {
  const gated =
    mutationGate(request)

  if (gated) return gated

  const row =
    await readJsonObject(
      request,
    )

  if (!row) {
    return invalidRequest()
  }

  const allowedKeys = [
    'id',
    'cmsLiveId',
  ] as const

  if (
    !hasOnlyKeys(
      row,
      allowedKeys,
    ) ||
    !validCultNoteUuid(
      row.id,
    ) ||
    !validCultNoteUuid(
      row.cmsLiveId,
    )
  ) {
    return invalidRequest()
  }

  const result =
    await deleteMemberCultNote(
      row.cmsLiveId,
      row.id,
    )

  if (!result.ok) {
    return failure(
      result.reason,
    )
  }

  return json({
    ok: true,
  })
}
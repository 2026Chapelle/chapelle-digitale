import { NextRequest, NextResponse } from 'next/server'

import { isAdminRequest } from '@/lib/admin-auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { SITE_URL } from '@/lib/site-url'
import {
  listManageableReplayReactionSettings,
  updateReplayReactionGovernance,
  type ReplayReactionGovernanceInput,
  type ReplayReactionGovernanceReason,
} from '@/lib/live/live-replay-reaction-admin-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BODY_BYTES = 4096
const PATCH_LIMIT = { limit: 30, windowMs: 60_000 } as const

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}

function failure(reason: ReplayReactionGovernanceReason | 'rate_limited') {
  if (reason === 'invalid_request') return json({ ok: false, reason }, 400)
  if (reason === 'forbidden') return json({ ok: false, reason }, 403)
  if (reason === 'not_found') return json({ ok: false, reason }, 404)
  if (reason === 'rate_limited') return json({ ok: false, reason }, 429)
  return json({ ok: false, reason: 'unavailable' }, 503)
}

function sameOrigin(request: NextRequest): boolean {
  const secFetchSite = request.headers.get('sec-fetch-site')?.toLowerCase()
  if (secFetchSite === 'cross-site') return false

  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return false

  try {
    return new URL(origin).origin === new URL(SITE_URL).origin
  } catch {
    return false
  }
}

function hasJsonContentType(request: NextRequest): boolean {
  return (request.headers.get('content-type')?.toLowerCase() ?? '')
    .startsWith('application/json')
}

function hasExactKeys(row: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(row)
  return actual.length === keys.length && keys.every((key) => actual.includes(key))
}

async function readBoundedJsonObject(
  request: NextRequest,
): Promise<Record<string, unknown> | null> {
  const declared = request.headers.get('content-length')
  if (declared && Number(declared) > MAX_BODY_BYTES) return null

  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return null
    const body = JSON.parse(raw) as unknown
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

function validScopePair(
  organizationId: unknown,
  organizationUnitId: unknown,
): organizationId is string | null {
  if (organizationId === null && organizationUnitId === null) return true
  return validUuid(organizationId) && validUuid(organizationUnitId)
}

function limitedPatch(request: NextRequest): NextResponse | null {
  const limited = rateLimit(
    `admin-replay-reaction:ip:${clientIp(request)}`,
    PATCH_LIMIT,
  )
  if (limited.ok) return null

  const response = failure('rate_limited')
  response.headers.set('Retry-After', String(Math.max(1, limited.retryAfterSec)))
  return response
}

export async function GET(request: NextRequest) {
  if (Array.from(request.nextUrl.searchParams.keys()).length > 0) {
    return failure('invalid_request')
  }
  if (!isAdminRequest(request)) return failure('forbidden')

  const result = await listManageableReplayReactionSettings()
  return result.ok ? json({ ok: true, data: result.data }) : failure(result.reason)
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return json({ ok: false, reason: 'invalid_origin' }, 403)
  if (!hasJsonContentType(request)) return failure('invalid_request')

  const row = await readBoundedJsonObject(request)
  if (
    !row ||
    !hasExactKeys(row, [
      'cmsLiveId',
      'enabled',
      'organizationId',
      'organizationUnitId',
    ]) ||
    !validUuid(row.cmsLiveId) ||
    typeof row.enabled !== 'boolean' ||
    !validScopePair(row.organizationId, row.organizationUnitId)
  ) {
    return failure('invalid_request')
  }

  if (!isAdminRequest(request)) return failure('forbidden')

  const limited = limitedPatch(request)
  if (limited) return limited

  const result = await updateReplayReactionGovernance(
    row as unknown as ReplayReactionGovernanceInput,
  )
  return result.ok ? json({ ok: true, data: result.data }) : failure(result.reason)
}

import { NextResponse, type NextRequest } from 'next/server'
import { resolveEditorialWorkspaceAccess } from '@/lib/intelligence/editorial/permissions'
import { getEditorialSettings, upsertEditorialSettings } from '@/lib/intelligence/editorial/store'
import { toPublicEditorialSettings } from '@/lib/intelligence/editorial/dto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  return body as Record<string, unknown>
}

export async function GET(req: NextRequest) {
  const access = await resolveEditorialWorkspaceAccess(req, 'read')
  if (access instanceof NextResponse) return access

  const settings = await getEditorialSettings(access.organizationId)
  return NextResponse.json({
    ok: true,
    data: {
      settings: toPublicEditorialSettings(settings),
    },
  })
}

export async function PATCH(req: NextRequest) {
  const access = await resolveEditorialWorkspaceAccess(req, 'write')
  if (access instanceof NextResponse) return access

  const body = parseBody(await req.json().catch(() => null))
  if (!body) {
    return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
  }

  const settings = await upsertEditorialSettings({
    organizationId: access.organizationId,
    timezone: typeof body.timezone === 'string' ? body.timezone : 'UTC',
    refreshMode: body.refreshMode === 'daily' ? 'daily' : 'manual',
    refreshTimeLocal: typeof body.refreshTimeLocal === 'string' || body.refreshTimeLocal === null
      ? (body.refreshTimeLocal as string | null | undefined)
      : undefined,
    weeklyCapacity:
      body.weeklyCapacity && typeof body.weeklyCapacity === 'object' && !Array.isArray(body.weeklyCapacity)
        ? (body.weeklyCapacity as any)
        : { weeklyTotal: 0, family: {}, channel: {}, contentKind: {} },
    channelCapacity:
      body.channelCapacity && typeof body.channelCapacity === 'object' && !Array.isArray(body.channelCapacity)
        ? (body.channelCapacity as Record<string, number>)
        : undefined,
    contentKindCapacity:
      body.contentKindCapacity && typeof body.contentKindCapacity === 'object' && !Array.isArray(body.contentKindCapacity)
        ? (body.contentKindCapacity as Record<string, number>)
        : undefined,
    manualRefreshEnabled: typeof body.manualRefreshEnabled === 'boolean' ? body.manualRefreshEnabled : undefined,
    createdBy: access.userId,
    updatedBy: access.userId,
  })

  return NextResponse.json({
    ok: true,
    data: {
      settings: toPublicEditorialSettings(settings),
    },
  })
}


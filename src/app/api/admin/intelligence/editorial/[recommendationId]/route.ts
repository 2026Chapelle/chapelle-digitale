import { NextResponse, type NextRequest } from 'next/server'
import { canTransitionEditorialRecommendation } from '@/lib/intelligence/editorial/contracts'
import { resolveEditorialWorkspaceAccess } from '@/lib/intelligence/editorial/permissions'
import {
  appendEditorialRecommendationEvent,
  getEditorialRecommendation,
  patchEditorialRecommendation,
} from '@/lib/intelligence/editorial/store'
import { toPublicEditorialRecommendation } from '@/lib/intelligence/editorial/dto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseBody(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  return body as Record<string, unknown>
}

export async function GET(req: NextRequest, ctx: { params: { recommendationId: string } }) {
  const access = await resolveEditorialWorkspaceAccess(req, 'read')
  if (access instanceof NextResponse) return access

  const recommendation = await getEditorialRecommendation(access.organizationId, ctx.params.recommendationId)
  if (!recommendation) {
    return NextResponse.json({ ok: false, message: 'Recommandation introuvable.' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    data: {
      recommendation: toPublicEditorialRecommendation(recommendation),
    },
  })
}

export async function PATCH(req: NextRequest, ctx: { params: { recommendationId: string } }) {
  const access = await resolveEditorialWorkspaceAccess(req, 'write')
  if (access instanceof NextResponse) return access

  const body = parseBody(await req.json().catch(() => null))
  if (!body) {
    return NextResponse.json({ ok: false, message: 'Payload invalide.' }, { status: 400 })
  }

  const current = await getEditorialRecommendation(access.organizationId, ctx.params.recommendationId)
  if (!current) {
    return NextResponse.json({ ok: false, message: 'Recommandation introuvable.' }, { status: 404 })
  }

  const nextStatus = typeof body.status === 'string' ? body.status : undefined
  if (nextStatus && !canTransitionEditorialRecommendation(current.status, nextStatus as any)) {
    return NextResponse.json({ ok: false, message: 'Transition invalide.' }, { status: 400 })
  }

  const nowIso = new Date().toISOString()
  const updated = await patchEditorialRecommendation(access.organizationId, current.id, {
    status: nextStatus as any,
    priorityBand: typeof body.priorityBand === 'string' ? (body.priorityBand as any) : undefined,
    scheduledFor: typeof body.scheduledFor === 'string' || body.scheduledFor === null ? (body.scheduledFor as string | null | undefined) : undefined,
    batchId: typeof body.batchId === 'string' || body.batchId === null ? (body.batchId as string | null | undefined) : undefined,
    parentRecommendationId:
      typeof body.parentRecommendationId === 'string' || body.parentRecommendationId === null
        ? (body.parentRecommendationId as string | null | undefined)
        : undefined,
    sourceTitle: typeof body.sourceTitle === 'string' || body.sourceTitle === null ? (body.sourceTitle as string | null | undefined) : undefined,
    humanTitleOverride:
      typeof body.humanTitleOverride === 'string' || body.humanTitleOverride === null
        ? (body.humanTitleOverride as string | null | undefined)
        : undefined,
    humanNotes: typeof body.humanNotes === 'string' || body.humanNotes === null ? (body.humanNotes as string | null | undefined) : undefined,
    humanEdit: body.humanEdit && typeof body.humanEdit === 'object' && !Array.isArray(body.humanEdit) ? (body.humanEdit as Record<string, unknown>) : undefined,
    lastHumanActionAt: nowIso,
    acceptedAt: nextStatus === 'ACCEPTED' ? nowIso : undefined,
    scheduledAt: nextStatus === 'SCHEDULED' ? nowIso : undefined,
    completedAt: nextStatus === 'COMPLETED' ? nowIso : undefined,
    rejectedAt: nextStatus === 'REJECTED' ? nowIso : undefined,
    archivedAt: nextStatus === 'ARCHIVED' ? nowIso : undefined,
    updatedBy: access.userId,
  })

  if (!updated) {
    return NextResponse.json({ ok: false, message: 'Recommandation introuvable.' }, { status: 404 })
  }

  const eventType = nextStatus ?? 'MODIFIED'
  await appendEditorialRecommendationEvent({
    organizationId: access.organizationId,
    recommendationId: updated.id,
    eventType,
    payload: {
      patch: body,
      status: updated.status,
      at: nowIso,
    },
    createdBy: access.userId,
  })

  return NextResponse.json({
    ok: true,
    data: {
      recommendation: toPublicEditorialRecommendation(updated),
    },
  })
}


import { NextResponse, type NextRequest } from 'next/server'
import { resolveEditorialWorkspaceAccess } from '@/lib/intelligence/editorial/permissions'
import { refreshEditorialIntelligence } from '@/lib/intelligence/editorial/refresh'
import { loadEditorialContentSources } from '@/lib/intelligence/editorial/content-sources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const access = await resolveEditorialWorkspaceAccess(req, 'write')
  if (access instanceof NextResponse) return access

  const body = await req.json().catch(() => null)
  const payload = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  try {
  const sources = await loadEditorialContentSources()
  const refresh = await refreshEditorialIntelligence({
    organizationId: access.organizationId,
    nowIso: typeof payload.nowIso === 'string' ? payload.nowIso : new Date().toISOString(),
    mode: 'manual',
    requestedBy: access.userId,
    actor: {
      id: access.userId,
      organizationId: access.organizationId,
      permissions: ['can_manage_editorial_intelligence'],
    },
    machineAuth: null,
    sources,
    signals: [],
  })

  return NextResponse.json({ ok: true, data: { refresh } })
  } catch (error) {
    console.error('[editorial-refresh]', error instanceof Error ? error.message : 'unknown-error')
    return NextResponse.json({ ok: false, message: 'Actualisation éditoriale impossible.' }, { status: 500 })
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { refreshEditorialIntelligence } from '@/lib/intelligence/editorial/refresh'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isMachineRequest(req: NextRequest): boolean {
  const expected = process.env.EDITORIAL_REFRESH_SECRET
  const provided = req.headers.get('x-editorial-refresh-secret')
  return Boolean(expected && provided && provided === expected)
}

export async function POST(req: NextRequest) {
  if (!isMachineRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Accès machine requis.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const payload = body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  if (typeof payload.organizationId !== 'string' || !payload.organizationId) {
    return NextResponse.json({ ok: false, message: 'Portée organisationnelle requise.' }, { status: 400 })
  }

  const refresh = await refreshEditorialIntelligence({
    organizationId: payload.organizationId,
    nowIso: typeof payload.nowIso === 'string' ? payload.nowIso : new Date().toISOString(),
    mode: 'scheduled',
    requestedBy: null,
    actor: null,
    machineAuth: { kind: 'server', authenticated: true },
    sources: [],
    signals: [],
  })

  return NextResponse.json({ ok: true, data: { refresh } })
}

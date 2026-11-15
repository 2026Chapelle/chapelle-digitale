import { NextResponse } from 'next/server'
import { getCanonicalLiveState, getCanonicalLiveSnapshot } from '@/lib/live/canonical-server'

export const dynamic = 'force-dynamic'

/**
 * Payload PUBLIC : état canonique + origine. Les diagnostics techniques (codes d'erreur
 * YouTube, état du cache) sont réservés à /api/admin/live/diagnostics.
 */
export type CanonicalLivePayload = {
  state: Awaited<ReturnType<typeof getCanonicalLiveState>>
  source: 'youtube' | 'cms' | 'none'
}

export async function GET() {
  const snapshot = await getCanonicalLiveSnapshot()

  return NextResponse.json<CanonicalLivePayload>({
    state: snapshot.state,
    source: snapshot.source,
  })
}

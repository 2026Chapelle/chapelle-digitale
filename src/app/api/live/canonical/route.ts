import { NextResponse } from 'next/server'
import { getCanonicalLiveState } from '@/lib/live/canonical-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    state: await getCanonicalLiveState(),
  })
}
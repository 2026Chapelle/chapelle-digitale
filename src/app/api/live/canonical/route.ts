import { NextResponse } from 'next/server'
import { cmsList } from '@/lib/cms'
import { resolveLiveState, type CmsLiveLike } from '@/lib/home/contextual'
import { detectYouTubeLive } from '@/lib/home/youtube-live'
export const dynamic = 'force-dynamic'
export async function GET() {
  try { const rows = await cmsList<CmsLiveLike>('cms_lives', { publicOnly: true, noStore: true, orderBy: 'created_at', ascending: false, limit: 12 }); return NextResponse.json({ state: (await detectYouTubeLive()) || resolveLiveState(rows) }) } catch { return NextResponse.json({ state: { status: 'OFFLINE' } }) }
}

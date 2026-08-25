import { NextResponse, type NextRequest } from 'next/server'
import { buildEditorialCalendarReadModel } from '@/lib/intelligence/editorial/calendar-read-model'
import { resolveEditorialWorkspaceAccess } from '@/lib/intelligence/editorial/permissions'
import { getEditorialSettings, listEditorialRecommendations } from '@/lib/intelligence/editorial/store'
import { toPublicEditorialRecommendation, toPublicEditorialSettings } from '@/lib/intelligence/editorial/dto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const access = await resolveEditorialWorkspaceAccess(req, 'read')
  if (access instanceof NextResponse) return access

  const [recommendations, settings] = await Promise.all([
    listEditorialRecommendations(access.organizationId),
    getEditorialSettings(access.organizationId),
  ])

  const calendar = buildEditorialCalendarReadModel(recommendations)

  return NextResponse.json({
    ok: true,
    data: {
      organizationId: access.organizationId,
      recommendations: recommendations.map(toPublicEditorialRecommendation),
      calendar,
      settings: toPublicEditorialSettings(settings),
    },
  })
}


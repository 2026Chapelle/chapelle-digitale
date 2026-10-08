import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { getRetreatDays, saveRetreatDayDraft } from '@/lib/mahanaim/admin-retreat-days'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Accès administrateur requis.' }, { status: 401 })
  }

  try {
    const days = await getRetreatDays()
    return NextResponse.json({ ok: true, data: days })
  } catch {
    return NextResponse.json({ ok: false, message: 'Impossible de charger les journées. Réessayez.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Accès administrateur requis.' }, { status: 401 })
  }

  const body: unknown = await req.json().catch(() => null)
  const result = await saveRetreatDayDraft(body)

  if (!result.ok) {
    const status = result.reason === 'invalid' ? 400 : result.reason === 'not_found' ? 404 : 500
    const message = result.reason === 'invalid'
      ? result.message
      : result.reason === 'not_found'
        ? 'Cette journée est introuvable dans la retraite.'
        : 'La sauvegarde a échoué. Vos modifications locales sont conservées ; réessayez.'
    return NextResponse.json({ ok: false, message }, { status })
  }

  return NextResponse.json({ ok: true, data: result.day })
}

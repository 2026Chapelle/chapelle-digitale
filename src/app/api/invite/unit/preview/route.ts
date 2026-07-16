import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { hashInviteToken } from '@/lib/erp/unit-governance-rpc'
import { getInvitationByTokenHash, getUnitPublicLabel } from '@/lib/erp/unit-governance-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Indisponible en démo.' }, { status: 503 })
  }
  const token = req.nextUrl.searchParams.get('token') || ''
  if (!token || token.length < 16) {
    return NextResponse.json({ ok: false, message: 'Invitation invalide.' }, { status: 400 })
  }
  try {
    const inv = await getInvitationByTokenHash(hashInviteToken(token))
    if (!inv) {
      return NextResponse.json({ ok: false, message: 'Invitation invalide.' }, { status: 400 })
    }
    let status = inv.status as string
    if (status === 'pending' && new Date(inv.expires_at as string).getTime() < Date.now()) {
      status = 'expired'
    }
    if (status !== 'pending') {
      return NextResponse.json({ ok: false, message: 'Invitation indisponible.', code: status }, { status: 400 })
    }
    const unit = await getUnitPublicLabel(inv.organization_id as string, inv.organization_unit_id as string)
    return NextResponse.json({
      ok: true,
      data: {
        unit_name: unit?.name || null,
        unit_type: unit?.unit_type || null,
        proposed_unit_role: inv.proposed_unit_role,
        expires_at: inv.expires_at,
      },
    })
  } catch {
    return NextResponse.json({ ok: false, message: 'Invitation invalide.' }, { status: 400 })
  }
}

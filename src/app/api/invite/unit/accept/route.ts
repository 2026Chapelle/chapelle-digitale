import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { hashInviteToken, rpcAcceptInvitation } from '@/lib/erp/unit-governance-rpc'
import { normalizeEmail } from '@/lib/erp/unit-governance-rules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Indisponible en démo.' }, { status: 503 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token || token.length < 16) {
      return NextResponse.json({ ok: false, message: 'Token invalide.' }, { status: 400 })
    }
    const sp = await getVerifiedRouteProfile()
    if (!sp?.uid || !sp.email) {
      return NextResponse.json({ ok: false, message: 'Authentification requise.' }, { status: 401 })
    }
    const { id, error } = await rpcAcceptInvitation({
      tokenHash: hashInviteToken(token),
      userId: sp.uid,
      email: normalizeEmail(sp.email),
    })
    if (error || !id) {
      const msg = error || 'Acceptation impossible.'
      // invitation_expired: RPC succeeded with NULL after atomic expire — never treat as success
      const status =
        msg === 'invitation_expired' || msg.includes('invitation_expired')
          ? 400
          : msg.includes('email mismatch')
            ? 403
            : msg.includes('suspended or removed')
              ? 403
              : 400
      return NextResponse.json(
        {
          ok: false,
          message: msg === 'invitation_expired' ? 'invitation_expired' : msg,
          code: msg === 'invitation_expired' ? 'invitation_expired' : undefined,
        },
        { status },
      )
    }
    return NextResponse.json({ ok: true, data: { membership_id: id } })
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : 'Erreur' },
      { status: 400 },
    )
  }
}

import { NextResponse, type NextRequest } from 'next/server'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import {
  getGroupSpaceAccess,
  listGroupPosts,
  createGroupPost,
  moderateGroupPost,
  withdrawGroupPost,
} from '@/lib/community/group-space-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
    },
  })
}

function failure(error: unknown) {
  const status = error && typeof error === 'object'
    ? (error as { status?: unknown }).status
    : undefined

  if (typeof status === 'number' && [400, 401, 403, 409].includes(status)) {
    const messages: Record<number, string> = {
      400: 'Donnees invalides. Verifiez les champs et votre accord de publication.',
      401: 'Connexion requise.',
      403: 'Acces refuse.',
      409: 'Le contenu a change. Actualisez la page.',
    }
    return json({ ok: false, message: messages[status] }, status)
  }

  return json({
    ok: false,
    message: 'Impossible de charger ou enregistrer le contenu. Reessayez.',
  }, 500)
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const session = await getVerifiedRouteProfile()
    if (!session) return json({ ok: false, message: 'Connexion requise.' }, 401)

    const { id } = await context.params
    if (!UUID.test(id)) return json({ ok: false, message: 'Groupe invalide.' }, 400)

    const access = await getGroupSpaceAccess(session, id)
    const posts = await listGroupPosts(session, id)

    return json({
      ok: true,
      data: {
        group: access.group,
        posts,
        permissions: { manage: access.manager },
        viewer_id: session.uid,
      },
    })
  } catch (error) {
    return failure(error)
  }
}

export async function POST(req: NextRequest, context: Context) {
  try {
    const session = await getVerifiedRouteProfile()
    if (!session) return json({ ok: false, message: 'Connexion requise.' }, 401)

    // Browser submissions must originate from this site.
    const origin = req.headers.get('origin')
    const fetchSite = req.headers.get('sec-fetch-site')
    if (
      !origin ||
      origin !== (
        process.env.NODE_ENV === 'production'
          ? 'https://citadelle.chapelleduroyaume.org'
          : new URL(req.url).origin
      ) ||
      fetchSite === 'cross-site'
    ) {
      return json({ ok: false, message: 'Origine non autorisee.' }, 403)
    }

    const { id } = await context.params
    if (!UUID.test(id)) return json({ ok: false, message: 'Groupe invalide.' }, 400)

    const contentType = req.headers.get('content-type') || ''
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return json({ ok: false, message: 'Format JSON requis.' }, 400)
    }

    const raw = await req.text()
    if (raw.length > 65536) {
      return json({ ok: false, message: 'Contenu trop volumineux.' }, 400)
    }

    let body: Record<string, unknown>
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return json({ ok: false, message: 'Donnees invalides.' }, 400)
      }
      body = parsed as Record<string, unknown>
    } catch {
      return json({ ok: false, message: 'JSON invalide.' }, 400)
    }

    if (body.action === 'create') {
      // Whitelist content fields; identity and publication state are server-owned.
      const data = await createGroupPost(session, id, {
        kind: body.kind,
        title: body.title,
        body: body.body,
        visibility: body.visibility,
        resource_url: body.resource_url,
        consent: body.consent,
      })
      return json({ ok: true, data }, 201)
    }

    if (body.action === 'moderate' || body.action === 'withdraw') {
      if (typeof body.post_id !== 'string' || !UUID.test(body.post_id)) {
        return json({ ok: false, message: 'Identifiant de contenu invalide.' }, 400)
      }

      if (body.action === 'moderate') {
        const data = await moderateGroupPost(
          session, id, body.post_id, body.decision,
        )
        return json({ ok: true, data })
      }

      await withdrawGroupPost(session, id, body.post_id)
      return json({ ok: true })
    }

    return json({ ok: false, message: 'Action inconnue.' }, 400)
  } catch (error) {
    return failure(error)
  }
}
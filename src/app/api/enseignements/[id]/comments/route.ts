import {
  NextRequest,
  NextResponse,
} from 'next/server'

import {
  supabaseAdmin,
} from '@/lib/supabase'

import {
  getSessionProfile,
  getVerifiedRouteProfile,
} from '@/lib/member-auth'

import {
  clientIp,
  rateLimit,
} from '@/lib/rate-limit'

import {
  SITE_URL,
} from '@/lib/site-url'

import {
  getTeachingDelivery,
} from '@/lib/teachings/teaching-access-server'

import {
  hasTeachingsPremiumAccess,
  isMemberStatus,
} from '@/lib/teachings/teaching-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        ...headers,
      },
    },
  )
}

function configuredOrigin():
  | string
  | null {
  try {
    return new URL(
      SITE_URL,
    ).origin
  } catch {
    return null
  }
}

function allowedOrigin(
  request: NextRequest,
):
  | boolean
  | null {
  const origin =
    configuredOrigin()

  if (!origin) {
    return null
  }

  if (
    request.headers
      .get('sec-fetch-site')
      ?.toLowerCase() ===
    'cross-site'
  ) {
    return false
  }

  const presented =
    request.headers.get('origin')

  if (
    !presented ||
    presented === 'null'
  ) {
    return false
  }

  try {
    return (
      new URL(presented).origin ===
        origin &&
      presented === origin
    )
  } catch {
    return false
  }
}

async function resolveAccessContext() {
  const session =
    await getSessionProfile()

  const authenticated =
    Boolean(session)

  const isMember =
    isMemberStatus(
      session?.profile
        ?.membre_statut,
    )

  const hasPremiumEntitlement =
    authenticated && isMember
      ? await hasTeachingsPremiumAccess(
          supabaseAdmin,
          session?.uid,
        )
      : false

  return {
    session,
    context: {
      authenticated,
      isMember,
      hasPremiumEntitlement,
      isAdmin: false,
    },
  }
}

async function teachingIsAccessible(
  teachingId: string,
) {
  const {
    context,
  } =
    await resolveAccessContext()

  const delivery =
    await getTeachingDelivery(
      teachingId,
      context,
    )

  return delivery.allowed
}

export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: {
      id: string
    }
  },
) {
  if (
    !UUID_RE.test(params.id)
  ) {
    return json(
      {
        ok: false,
        message:
          'Enseignement invalide.',
      },
      400,
    )
  }

  const allowed =
    await teachingIsAccessible(
      params.id,
    )

  if (!allowed) {
    return json(
      {
        ok: false,
        message:
          'Enseignement inaccessible.',
      },
      404,
    )
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        'cms_teaching_comments',
      )
      .select(
        'id, display_name, body, created_at',
      )
      .eq(
        'teaching_id',
        params.id,
      )
      .eq(
        'status',
        'published',
      )
      .order(
        'created_at',
        {
          ascending: false,
        },
      )
      .limit(50)

  if (error) {
    return json(
      {
        ok: false,
        message:
          'Impossible de charger les commentaires.',
      },
      500,
    )
  }

  return json({
    ok: true,
    data: data || [],
  })
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: {
      id: string
    }
  },
) {
  if (
    !UUID_RE.test(params.id)
  ) {
    return json(
      {
        ok: false,
        message:
          'Enseignement invalide.',
      },
      400,
    )
  }

  const originAllowed =
    allowedOrigin(request)

  if (originAllowed === null) {
    return json(
      {
        ok: false,
        message:
          'Configuration de sécurité indisponible.',
      },
      503,
    )
  }

  if (!originAllowed) {
    return json(
      {
        ok: false,
        message:
          'Origine interdite.',
      },
      403,
    )
  }

  const rl =
    rateLimit(
      `teaching-comment:${clientIp(request)}`,
      {
        limit: 6,
        windowMs:
          10 * 60 * 1000,
      },
    )

  if (!rl.ok) {
    return json(
      {
        ok: false,
        message:
          'Trop de commentaires envoyés. Réessayez plus tard.',
      },
      429,
      {
        'Retry-After':
          String(
            rl.retryAfterSec,
          ),
      },
    )
  }

  const session =
    await getVerifiedRouteProfile()

  if (!session) {
    return json(
      {
        ok: false,
        message:
          'Connectez-vous pour commenter.',
      },
      401,
    )
  }

  const isMember =
    isMemberStatus(
      session.profile
        ?.membre_statut,
    )

  const hasPremiumEntitlement =
    isMember
      ? await hasTeachingsPremiumAccess(
          supabaseAdmin,
          session.uid,
        )
      : false

  const delivery =
    await getTeachingDelivery(
      params.id,
      {
        authenticated: true,
        isMember,
        hasPremiumEntitlement,
        isAdmin: false,
      },
    )

  if (!delivery.allowed) {
    return json(
      {
        ok: false,
        message:
          'Enseignement inaccessible.',
      },
      403,
    )
  }

  const payload =
    await request
      .json()
      .catch(() => ({}))

  const rawBody =
    typeof payload?.body ===
    'string'
      ? payload.body.trim()
      : ''

  if (
    rawBody.length < 2 ||
    rawBody.length > 2000
  ) {
    return json(
      {
        ok: false,
        message:
          'Le commentaire doit contenir entre 2 et 2000 caractères.',
      },
      400,
    )
  }

  const profile =
    session.profile || {}

  const firstName =
    typeof profile.prenom ===
    'string'
      ? profile.prenom.trim()
      : ''

  const lastName =
    typeof profile.nom ===
    'string'
      ? profile.nom.trim()
      : ''

  const profileName =
    `${firstName} ${lastName}`
      .trim()

  const fallbackName =
    session.email
      ?.split('@')[0]
      ?.trim() ||
    'Membre'

  const displayName =
    (
      profileName ||
      fallbackName
    ).slice(0, 120)

  const {
    error,
  } =
    await supabaseAdmin
      .from(
        'cms_teaching_comments',
      )
      .insert({
        teaching_id:
          params.id,

        user_id:
          session.uid,

        display_name:
          displayName,

        body:
          rawBody,

        status:
          'pending',
      })

  if (error) {
    return json(
      {
        ok: false,
        message:
          'Le commentaire n’a pas pu être envoyé.',
      },
      500,
    )
  }

  return json(
    {
      ok: true,
      status: 'pending',
      message:
        'Commentaire envoyé pour modération.',
    },
    201,
  )
}
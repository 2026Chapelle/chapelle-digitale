import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { resolveOfflineContent, extractStoragePath, MEDIA_BUCKET } from '@/lib/offline/server'
import { MAX_OFFLINE_FILE_SIZE_BYTES, isAllowedOfflineMime, normalizeMime } from '@/lib/offline/policy'

/**
 * Proxy de téléchargement hors-ligne — les octets transitent par le SERVEUR.
 *
 *   GET /api/member/offline/download?contentId=...
 *     → flux binaire (application/pdf | audio/*) avec en-têtes de version d'accès.
 *
 * Pourquoi un proxy plutôt qu'une URL signée renvoyée au client ?
 *  - Le bucket `media` est PUBLIC : on refuse d'exposer/persister l'URL dans le
 *    navigateur. Le client ne reçoit qu'un flux, qu'il stocke en Blob local.
 *  - Chaque téléchargement ré-authentifie (identité stricte) et re-vérifie la
 *    publication : un accès révoqué échoue immédiatement.
 *
 * Garde-fous : type pdf|audio uniquement, MIME whitelisté, taille ≤ plafond.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (IS_DEMO_MODE) {
    return NextResponse.json({ ok: false, message: 'Indisponible en démo.' }, { status: 401 })
  }

  const sp = await getVerifiedRouteProfile()
  if (!sp) {
    return NextResponse.json({ ok: false, message: 'Connexion requise.' }, { status: 401 })
  }

  const contentId = req.nextUrl.searchParams.get('contentId') || ''
  if (!contentId) {
    return NextResponse.json({ ok: false, message: 'contentId requis.' }, { status: 400 })
  }

  const content = await resolveOfflineContent(contentId)
  if (!content) {
    return NextResponse.json({ ok: false, message: 'Contenu indisponible.' }, { status: 403 })
  }

  // Récupère les octets côté serveur (jamais d'URL rendue au client).
  let blob: Blob | null = null
  const path = extractStoragePath(content.url, MEDIA_BUCKET)
  if (path) {
    const { data, error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).download(path)
    if (error || !data) {
      return NextResponse.json({ ok: false, message: 'Fichier introuvable.' }, { status: 404 })
    }
    blob = data
  } else {
    // URL hors bucket `media` (cas résiduel) : lecture serveur directe.
    try {
      const res = await fetch(content.url)
      if (!res.ok) {
        return NextResponse.json({ ok: false, message: 'Fichier introuvable.' }, { status: 404 })
      }
      blob = await res.blob()
    } catch {
      return NextResponse.json({ ok: false, message: 'Téléchargement impossible.' }, { status: 502 })
    }
  }

  // Type MIME effectif : celui du fichier, sinon celui déclaré en base.
  const effectiveMime = normalizeMime(blob.type || content.mime || '')
  if (effectiveMime && !isAllowedOfflineMime(content.type, effectiveMime)) {
    return NextResponse.json({ ok: false, message: 'Type de fichier non autorisé.' }, { status: 415 })
  }

  if (blob.size > MAX_OFFLINE_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { ok: false, message: 'Fichier trop volumineux pour le hors-ligne.' },
      { status: 413 },
    )
  }

  const contentType =
    effectiveMime || (content.type === 'pdf' ? 'application/pdf' : 'application/octet-stream')

  return new NextResponse(blob.stream(), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(blob.size),
      'Content-Disposition': 'inline',
      'X-Offline-Access-Version': content.accessVersion,
      'X-Offline-Content-Type': content.type,
      // Ne jamais mettre ce flux protégé en cache HTTP partagé.
      'Cache-Control': 'no-store, private',
    },
  })
}

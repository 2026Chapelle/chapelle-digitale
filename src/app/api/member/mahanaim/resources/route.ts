import { NextRequest, NextResponse } from 'next/server'
import { getMemberRetreatBySlug } from '@/lib/mahanaim/member-retreats-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SLUG = 'chambre-haute-2026'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEADERS = { 'Cache-Control': 'private, no-store' }

function reply(data: unknown, status: number) {
  return NextResponse.json(data, { status, headers: HEADERS })
}

export async function GET(req: NextRequest) {
  const dayId = req.nextUrl.searchParams.get('dayId')
  const resourceId = req.nextUrl.searchParams.get('resourceId')

  if (!dayId || !UUID.test(dayId) || (resourceId !== null && !UUID.test(resourceId))) {
    return reply({ ok: false, message: 'Identifiant invalide.' }, 400)
  }

  // Vérification AVANT toute lecture de ressource avec le service role.
  const result = await getMemberRetreatBySlug(SLUG)

  if (result.status === 'identity_required') {
    return reply({ ok: false, message: 'Connexion requise.' }, 401)
  }

  if (result.status === 'member_not_found') {
    return reply({ ok: false, message: 'Dossier membre requis.' }, 403)
  }

  if (result.status === 'unavailable') {
    return reply({ ok: false, message: 'Service temporairement indisponible.' }, 503)
  }

  if (result.status !== 'ok' || !result.retreat.enrolled) {
    return reply({ ok: false, message: 'Inscription requise.' }, 403)
  }

  const day = result.retreat.days.find(item => item.id === dayId)

  if (!day || !day.isUnlocked) {
    return reply({ ok: false, message: 'Journée indisponible.' }, 403)
  }

  try {
    const db = supabaseAdmin.schema('chapelle')
    let query = db
      .from('mahanaim_day_resources')
      .select('id,resource_type,session_type,title,resource_url,storage_path,scheduled_time,position')
      .eq('day_id', dayId)

    if (resourceId) {
      query = query.eq('id', resourceId)
    }

    const { data, error } = await query.order('position', { ascending: true })
    if (error) throw error

    const resources = data ?? []

    if (!resourceId) {
      return reply({
        ok: true,
        data: resources.map(resource => ({
          id: resource.id,
          resourceType: resource.resource_type,
          sessionType: resource.session_type,
          title: resource.title,
          scheduledTime: resource.scheduled_time,
          url: resource.storage_path ? null : resource.resource_url,
          isPrivate: Boolean(resource.storage_path),
        })),
      }, 200)
    }

    const resource = resources[0]
    if (!resource) {
      return reply({ ok: false, message: 'Ressource introuvable.' }, 404)
    }

    if (resource.storage_path) {
      if (resource.resource_type !== 'pdf' ||
          !resource.storage_path.startsWith(`mahanaim/${SLUG}/${dayId}/`)) {
        return reply({ ok: false, message: 'Fichier invalide.' }, 404)
      }

      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from('documents')
        .createSignedUrl(resource.storage_path, 60)

      if (signError || !signed?.signedUrl) {
        return reply({ ok: false, message: 'Téléchargement indisponible.' }, 503)
      }

      return reply({ ok: true, url: signed.signedUrl, expiresIn: 60 }, 200)
    }

    if (!resource.resource_url) {
      return reply({ ok: false, message: 'Lien pas encore disponible.' }, 404)
    }

    return reply({ ok: true, url: resource.resource_url }, 200)
  } catch {
    return reply({ ok: false, message: 'Ressources indisponibles.' }, 503)
  }
}
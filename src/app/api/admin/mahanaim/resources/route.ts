import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { RETREAT_SLUG } from '@/lib/mahanaim/admin-retreat-days'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const db = () => supabaseAdmin.schema('chapelle')

function denied(req: NextRequest) {
  return !isAdminRequest(req)
    ? NextResponse.json({ ok: false, message: 'Accès administrateur requis.' }, { status: 401 })
    : null
}

function validUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password) return false
    if (!host || host === 'localhost' || host.endsWith('.localhost')) return false
    if (host.endsWith('.local') || host.endsWith('.internal')) return false
    if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return false
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
    if (host.includes(':') || host.startsWith('[')) return false
    return true
  } catch {
    return false
  }
}

async function allowedDay(dayId: string): Promise<boolean> {
  const { data: retreat, error: re } = await db()
    .from('mahanaim_retreats')
    .select('id')
    .eq('slug', RETREAT_SLUG)
    .maybeSingle()

  if (re || !retreat?.id) throw new Error('retreat_read_failed')

  const { data: day, error: de } = await db()
    .from('mahanaim_retreat_days')
    .select('id')
    .eq('id', dayId)
    .eq('retreat_id', retreat.id)
    .maybeSingle()

  if (de) throw new Error('day_read_failed')
  return Boolean(day)
}

export async function GET(req: NextRequest) {
  const auth = denied(req)
  if (auth) return auth

  const dayId = req.nextUrl.searchParams.get('dayId')
  if (!dayId || !UUID.test(dayId)) {
    return NextResponse.json({ ok: false, message: 'Journée invalide.' }, { status: 400 })
  }

  try {
    if (!(await allowedDay(dayId))) {
      return NextResponse.json({ ok: false, message: 'Journée introuvable.' }, { status: 404 })
    }

    const { data, error } = await db()
      .from('mahanaim_day_resources')
      .select('id,day_id,resource_type,session_type,title,resource_url,storage_path,scheduled_time,position')
      .eq('day_id', dayId)
      .order('position', { ascending: true })

    if (error) throw error
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch {
    return NextResponse.json({ ok: false, message: 'Lecture des ressources impossible.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = denied(req)
  if (auth) return auth

  const input: unknown = await req.json().catch(() => null)
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ ok: false, message: 'Données invalides.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  const dayId = body.dayId
  const kind = body.resourceType
  const session = body.sessionType
  const title = body.title
  const url = body.url
  const time = body.scheduledTime

  if (typeof dayId !== 'string' || !UUID.test(dayId) ||
      (kind !== 'video' && kind !== 'pdf') ||
      typeof title !== 'string' || !title.trim() || title.length > 240 ||
      (url !== null && url !== undefined && url !== '' && !validUrl(url)) ||
      (time !== null && time !== undefined && time !== '' &&
        (typeof time !== 'string' || !TIME.test(time)))) {
    return NextResponse.json({ ok: false, message: 'Champs invalides.' }, { status: 400 })
  }

  if (kind === 'video' && session !== 'morning' && session !== 'evening') {
    return NextResponse.json({ ok: false, message: 'Séance invalide.' }, { status: 400 })
  }

  if (kind === 'pdf' && !validUrl(url)) {
    return NextResponse.json({ ok: false, message: 'Lien PDF HTTPS requis.' }, { status: 400 })
  }

  try {
    if (!(await allowedDay(dayId))) {
      return NextResponse.json({ ok: false, message: 'Journée introuvable.' }, { status: 404 })
    }

    const payload = {
      day_id: dayId,
      resource_type: kind,
      session_type: kind === 'video' ? session : null,
      title: title.trim(),
      resource_url: typeof url === 'string' && url.trim() ? url.trim() : null,
      storage_path: null,
      scheduled_time: kind === 'video' && typeof time === 'string' && time ? time : null,
    }

    if (kind === 'video') {
      const { data: existing, error: lookupError } = await db()
        .from('mahanaim_day_resources')
        .select('id')
        .eq('day_id', dayId)
        .eq('resource_type', 'video')
        .eq('session_type', session)
        .maybeSingle()

      if (lookupError) throw lookupError

      if (existing?.id) {
        const { data, error } = await db()
          .from('mahanaim_day_resources')
          .update(payload)
          .eq('id', existing.id)
          .eq('day_id', dayId)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json({ ok: true, data })
      }

      const { data, error } = await db()
        .from('mahanaim_day_resources')
        .insert(payload)
        .select()
        .single()

      if (error?.code === '23505') {
        return NextResponse.json({
          ok: false,
          message: 'Cette séance vient d’être créée. Actualisez puis réessayez.',
        }, { status: 409 })
      }

      if (error) throw error
      return NextResponse.json({ ok: true, data }, { status: 201 })
    }
    const { data, error } = await db()
      .from('mahanaim_day_resources')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false, message: 'Enregistrement impossible.' }, { status: 500 })
  }
}

async function ownedResource(dayId: string, resourceId: string) {
  if (!(await allowedDay(dayId))) return null

  const { data, error } = await db()
    .from('mahanaim_day_resources')
    .select('id,day_id,resource_type,session_type,storage_path')
    .eq('id', resourceId)
    .eq('day_id', dayId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function PATCH(req: NextRequest) {
  const auth = denied(req)
  if (auth) return auth

  const input: unknown = await req.json().catch(() => null)
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ ok: false, message: 'Données invalides.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  const { dayId, resourceId } = body

  if (typeof dayId !== 'string' || !UUID.test(dayId) ||
      typeof resourceId !== 'string' || !UUID.test(resourceId)) {
    return NextResponse.json({ ok: false, message: 'Identifiants invalides.' }, { status: 400 })
  }

  const fields = Object.keys(body).filter(key => key !== 'dayId' && key !== 'resourceId')
  if (!fields.length || fields.some(key => !['title', 'url', 'scheduledTime'].includes(key))) {
    return NextResponse.json({ ok: false, message: 'Champs non autorisés.' }, { status: 400 })
  }

  try {
    const resource = await ownedResource(dayId, resourceId)
    if (!resource) {
      return NextResponse.json({ ok: false, message: 'Ressource introuvable.' }, { status: 404 })
    }

    if (resource.storage_path) {
      return NextResponse.json({ ok: false, message: 'Modification des fichiers privés non disponible ici.' }, { status: 400 })
    }

    const patch: Record<string, string | null> = {}

    if ('title' in body) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 240) {
        return NextResponse.json({ ok: false, message: 'Titre invalide.' }, { status: 400 })
      }
      patch.title = body.title.trim()
    }

    if ('url' in body) {
      if (resource.resource_type === 'pdf' && !validUrl(body.url)) {
        return NextResponse.json({ ok: false, message: 'Lien PDF HTTPS requis.' }, { status: 400 })
      }
      if (resource.resource_type === 'video' &&
          body.url !== null && body.url !== '' && !validUrl(body.url)) {
        return NextResponse.json({ ok: false, message: 'Lien vidéo invalide.' }, { status: 400 })
      }
      patch.resource_url = typeof body.url === 'string' && body.url.trim()
        ? body.url.trim()
        : null
    }

    if ('scheduledTime' in body) {
      if (resource.resource_type !== 'video') {
        return NextResponse.json({ ok: false, message: 'Horaire réservé aux vidéos.' }, { status: 400 })
      }
      const time = body.scheduledTime
      if (time !== null && time !== '' && (typeof time !== 'string' || !TIME.test(time))) {
        return NextResponse.json({ ok: false, message: 'Horaire invalide.' }, { status: 400 })
      }
      patch.scheduled_time = typeof time === 'string' && time ? time : null
    }

    const { data, error } = await db()
      .from('mahanaim_day_resources')
      .update(patch)
      .eq('id', resourceId)
      .eq('day_id', dayId)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ ok: false }, { status: 404 })

    return NextResponse.json({ ok: true, data })
  } catch {
    return NextResponse.json({ ok: false, message: 'Modification impossible.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = denied(req)
  if (auth) return auth

  const input: unknown = await req.json().catch(() => null)
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ ok: false, message: 'Données invalides.' }, { status: 400 })
  }

  const body = input as Record<string, unknown>
  const { dayId, resourceId } = body

  if (typeof dayId !== 'string' || !UUID.test(dayId) ||
      typeof resourceId !== 'string' || !UUID.test(resourceId) ||
      Object.keys(body).some(key => key !== 'dayId' && key !== 'resourceId')) {
    return NextResponse.json({ ok: false, message: 'Identifiants invalides.' }, { status: 400 })
  }

  try {
    const resource = await ownedResource(dayId, resourceId)
    if (!resource) {
      return NextResponse.json({ ok: false, message: 'Ressource introuvable.' }, { status: 404 })
    }

    if (resource.storage_path) {
      const storagePath = resource.storage_path
      const expectedPrefix = `mahanaim/${RETREAT_SLUG}/${dayId}/`

      if (resource.resource_type !== 'pdf' ||
          !storagePath.startsWith(expectedPrefix) ||
          !storagePath.endsWith('.pdf')) {
        return NextResponse.json({
          ok: false,
          message: 'Chemin du document privé invalide.',
        }, { status: 400 })
      }

      // Retirer d'abord la référence accessible aux membres.
      const { data: deleted, error: deleteError } = await db()
        .from('mahanaim_day_resources')
        .delete()
        .eq('id', resourceId)
        .eq('day_id', dayId)
        .eq('storage_path', storagePath)
        .select('id')
        .maybeSingle()

      if (deleteError) throw deleteError

      if (!deleted) {
        return NextResponse.json({
          ok: false,
          message: 'Document déjà retiré ou introuvable.',
        }, { status: 404 })
      }

      // Nettoyer ensuite le stockage. En cas d'échec, le fichier
      // n'est plus référençable depuis l'API membre.
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('documents')
          .remove([storagePath])

        if (storageError) throw storageError
      } catch {
        return NextResponse.json({
          ok: true,
          cleanupRequired: true,
          message: 'Document retiré des ressources. Nettoyage du stockage à vérifier.',
        }, { status: 202 })
      }

      return NextResponse.json({
        ok: true,
        cleanupRequired: false,
      })
    }

    const { error } = await db()
      .from('mahanaim_day_resources')
      .delete()
      .eq('id', resourceId)
      .eq('day_id', dayId)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, message: 'Suppression impossible.' }, { status: 500 })
  }
}
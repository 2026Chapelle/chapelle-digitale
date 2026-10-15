import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildMahanaimPdfPath, isPdfMagicBytes, isValidMahanaimPdfPath, isValidMahanaimVideoUrl, MAHANAIM_PDF_MAX_BYTES, MAHANAIM_RETREAT_SLUG } from '@/lib/mahanaim/admin-day-resources'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SELECT = 'id,day_id,resource_type,session_type,title,resource_url,storage_path,scheduled_time,position'

type MediaResource = { id: string; day_id: string; resource_type: 'video' | 'pdf'; session_type: 'morning' | 'evening' | null; title: string; resource_url: string | null; storage_path: string | null; scheduled_time: string | null; position: number }

function reply(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } }) }
function validDayId(value: unknown): value is string { return typeof value === 'string' && UUID.test(value) }

async function assertDay(dayId: string) {
  const db = supabaseAdmin.schema('chapelle')
  const { data: retreat, error: retreatError } = await db.from('mahanaim_retreats').select('id').eq('slug', MAHANAIM_RETREAT_SLUG).maybeSingle()
  if (retreatError || !retreat?.id) return false
  const { data, error } = await db.from('mahanaim_retreat_days').select('id').eq('id', dayId).eq('retreat_id', retreat.id).maybeSingle()
  return !error && Boolean(data?.id)
}

async function listResources(dayId: string): Promise<MediaResource[]> {
  const { data, error } = await supabaseAdmin.schema('chapelle').from('mahanaim_day_resources').select(SELECT).eq('day_id', dayId).order('position', { ascending: true })
  if (error) throw error
  return Array.isArray(data) ? data as MediaResource[] : []
}

async function persistResource(dayId: string, existing: MediaResource | undefined, patch: Omit<MediaResource, 'id' | 'day_id'>) {
  const table = supabaseAdmin.schema('chapelle').from('mahanaim_day_resources')
  const query = existing
    ? table.update(patch).eq('id', existing.id).eq('day_id', dayId)
    : table.insert({ day_id: dayId, ...patch })
  const { data, error } = await query.select(SELECT).maybeSingle()
  if (error || !data) throw error ?? new Error('mahanaim_resource_write_failed')
  return data as MediaResource
}

async function upsertVideo(body: Record<string, unknown>) {
  const dayId = body.dayId
  const sessionType = body.sessionType
  const videoUrl = body.videoUrl
  if (!validDayId(dayId) || (sessionType !== 'morning' && sessionType !== 'evening') || !isValidMahanaimVideoUrl(videoUrl)) return null
  if (!await assertDay(dayId)) throw new Error('day_not_found')
  const resources = await listResources(dayId)
  const existing = resources.find((item) => item.resource_type === 'video' && item.session_type === sessionType)
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 240) : sessionType === 'morning' ? 'Vidéo de la matinale' : 'Vidéo de l’enseignement du soir'
  const scheduledTime = typeof body.scheduledTime === 'string' && body.scheduledTime.trim() ? body.scheduledTime.trim() : null
  return persistResource(dayId, existing, { resource_type: 'video', session_type: sessionType, title, resource_url: videoUrl, storage_path: null, scheduled_time: scheduledTime, position: sessionType === 'morning' ? 1 : 2 })
}

async function uploadPdf(req: NextRequest) {
  const form = await req.formData()
  const dayId = form.get('dayId')
  const file = form.get('file')
  if (!validDayId(dayId) || !(file instanceof File)) return { error: 'Données PDF invalides.', status: 400 as const }
  if (file.type !== 'application/pdf' || file.size === 0 || file.size > MAHANAIM_PDF_MAX_BYTES) return { error: 'Carnet PDF invalide ou trop volumineux.', status: 415 as const }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!isPdfMagicBytes(bytes)) return { error: 'Le contenu ne correspond pas à un PDF.', status: 422 as const }
  if (!await assertDay(dayId)) return { error: 'Journée introuvable.', status: 404 as const }
  const path = buildMahanaimPdfPath(dayId, randomUUID())
  const { error: uploadError } = await supabaseAdmin.storage.from('documents').upload(path, bytes, { contentType: 'application/pdf', upsert: false })
  if (uploadError) return { error: 'Import du carnet impossible.', status: 503 as const }
  try {
    const resources = await listResources(dayId)
    const existing = resources.find((item) => item.resource_type === 'pdf')
    const title = typeof form.get('title') === 'string' && String(form.get('title')).trim() ? String(form.get('title')).trim().slice(0, 240) : 'Carnet spirituel PDF'
    const saved = await persistResource(dayId, existing, { resource_type: 'pdf', session_type: null, title, resource_url: null, storage_path: path, scheduled_time: null, position: 3 })
    if (existing?.storage_path && isValidMahanaimPdfPath(existing.storage_path, dayId)) await supabaseAdmin.storage.from('documents').remove([existing.storage_path])
    return { saved, status: existing ? 200 as const : 201 as const }
  } catch {
    await supabaseAdmin.storage.from('documents').remove([path])
    return { error: 'Enregistrement du carnet impossible.', status: 503 as const }
  }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return reply({ ok: false, message: 'Accès administrateur requis.' }, 401)
  const dayId = req.nextUrl.searchParams.get('dayId')
  if (!validDayId(dayId)) return reply({ ok: false, message: 'Identifiant de journée invalide.' }, 400)
  try {
    if (!await assertDay(dayId)) return reply({ ok: false, message: 'Journée introuvable.' }, 404)
    return reply({ ok: true, data: await listResources(dayId) })
  } catch { return reply({ ok: false, message: 'Ressources indisponibles.' }, 503) }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return reply({ ok: false, message: 'Accès administrateur requis.' }, 401)
  try {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const result = await uploadPdf(req)
      return 'error' in result ? reply({ ok: false, message: result.error }, result.status) : reply({ ok: true, data: result.saved }, result.status)
    }
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ ok: false, message: 'Données invalides.' }, 400)
    const saved = await upsertVideo(body as Record<string, unknown>)
    return saved ? reply({ ok: true, data: saved }, 201) : reply({ ok: false, message: 'Vidéo invalide.' }, 400)
  } catch (error) { return reply({ ok: false, message: error instanceof Error && error.message === 'day_not_found' ? 'Journée introuvable.' : 'Enregistrement impossible.' }, error instanceof Error && error.message === 'day_not_found' ? 404 : 503) }
}

export async function PATCH(req: NextRequest) { return POST(req) }

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return reply({ ok: false, message: 'Accès administrateur requis.' }, 401)
  const body = await req.json().catch(() => null) as { dayId?: unknown; resourceId?: unknown } | null
  if (!body || !validDayId(body.dayId) || !validDayId(body.resourceId)) return reply({ ok: false, message: 'Identifiant invalide.' }, 400)
  try {
    if (!await assertDay(body.dayId)) return reply({ ok: false, message: 'Journée introuvable.' }, 404)
    const resources = await listResources(body.dayId)
    const resource = resources.find((item) => item.id === body.resourceId)
    if (!resource) return reply({ ok: false, message: 'Ressource introuvable.' }, 404)
    const { error } = await supabaseAdmin.schema('chapelle').from('mahanaim_day_resources').delete().eq('id', resource.id).eq('day_id', body.dayId)
    if (error) throw error
    if (resource.storage_path && isValidMahanaimPdfPath(resource.storage_path, body.dayId)) await supabaseAdmin.storage.from('documents').remove([resource.storage_path])
    return reply({ ok: true })
  } catch { return reply({ ok: false, message: 'Dépublication impossible.' }, 503) }
}

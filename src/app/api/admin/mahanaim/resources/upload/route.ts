import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { RETREAT_SLUG } from '@/lib/mahanaim/admin-retreat-days'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'documents'
const MAX_PDF_BYTES = 10 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Accès administrateur requis.' }, { status: 401 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const dayId = form?.get('dayId')
  const title = form?.get('title')

  if (!(file instanceof File) ||
      typeof dayId !== 'string' || !UUID.test(dayId) ||
      typeof title !== 'string' || !title.trim() || title.length > 240) {
    return NextResponse.json({ ok: false, message: 'Données du PDF invalides.' }, { status: 400 })
  }

  if (file.type !== 'application/pdf' || file.size === 0 || file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ ok: false, message: 'PDF requis, taille maximale 10 Mo.' }, { status: 415 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
    return NextResponse.json({ ok: false, message: 'Signature PDF invalide.' }, { status: 422 })
  }

  const db = supabaseAdmin.schema('chapelle')
  const { data: retreat, error: retreatError } = await db
    .from('mahanaim_retreats')
    .select('id')
    .eq('slug', RETREAT_SLUG)
    .maybeSingle()

  if (retreatError || !retreat) {
    return NextResponse.json({ ok: false, message: 'Retraite indisponible.' }, { status: 500 })
  }

  const { data: day, error: dayError } = await db
    .from('mahanaim_retreat_days')
    .select('id')
    .eq('id', dayId)
    .eq('retreat_id', retreat.id)
    .maybeSingle()

  if (dayError || !day) {
    return NextResponse.json({ ok: false, message: 'Journée introuvable.' }, { status: 404 })
  }

  const path = `mahanaim/${RETREAT_SLUG}/${dayId}/${randomUUID()}.pdf`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: false })

  if (uploadError) {
    return NextResponse.json({ ok: false, message: 'Téléversement impossible.' }, { status: 500 })
  }

  const { data, error } = await db
    .from('mahanaim_day_resources')
    .insert({
      day_id: dayId,
      resource_type: 'pdf',
      session_type: null,
      title: title.trim(),
      resource_url: null,
      storage_path: path,
      scheduled_time: null,
    })
    .select('id,title,storage_path')
    .single()

  if (error) {
    let cleanupRequired = false
    try {
      const { error: cleanupError } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([path])
      cleanupRequired = Boolean(cleanupError)
    } catch {
      cleanupRequired = true
    }

    return NextResponse.json({
      ok: false,
      cleanupRequired,
      ...(cleanupRequired ? { storagePath: path } : {}),
      message: cleanupRequired
        ? `Enregistrement impossible. Nettoyage Storage requis pour le chemin : ${path}`
        : 'Enregistrement du document impossible.',
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data }, { status: 201 })
}

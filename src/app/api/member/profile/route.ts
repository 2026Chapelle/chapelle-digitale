import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { createRouteClient } from '@/lib/supabase-server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Profil du membre connecté (espace privé).
 *
 *   GET   /api/member/profile                 → profil de l'utilisateur courant
 *   PATCH /api/member/profile  { ...champs }  → met à jour son profil
 *   POST  /api/member/profile  (form-data avatar) → upload photo de profil
 *
 * Authentifié via la session Supabase (cookies). L'écriture est faite par la
 * service role APRÈS vérification de l'identité, puis restreinte à SON id —
 * jamais celui d'un autre membre. En démo : 401 (l'espace est mock côté UI).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Colonnes que le membre est autorisé à modifier lui-même. */
const EDITABLE = [
  'prenom', 'nom', 'pays', 'ville', 'telephone',
  'plateforme_principale', 'langue',
  'notifications_email', 'notifications_push', 'newsletter', 'whatsapp_alerts',
] as const

async function currentUserId(): Promise<string | null> {
  if (IS_DEMO_MODE) return null
  try {
    const supabase = createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user?.id ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', uid).single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, any> = {}
    for (const k of EDITABLE) if (k in body) patch[k] = body[k]
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, message: 'Aucun champ modifiable.' }, { status: 400 })
    }
    const { data, error } = await supabaseAdmin.from('profiles').update(patch).eq('id', uid).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const uid = await currentUserId()
  if (!uid) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const form = await req.formData()
    const file = form.get('avatar')
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: 'Aucune image fournie.' }, { status: 400 })
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ ok: false, message: 'Le fichier doit être une image.' }, { status: 400 })
    }
    if (file.size > 10_485_760) {
      return NextResponse.json({ ok: false, message: 'Image trop volumineuse (max 10 Mo).' }, { status: 413 })
    }
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${uid}/${randomUUID().slice(0, 8)}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await supabaseAdmin.storage
      .from('avatars')
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr) return NextResponse.json({ ok: false, message: upErr.message }, { status: 400 })

    const { data: pub } = supabaseAdmin.storage.from('avatars').getPublicUrl(path)
    const { error: updErr } = await supabaseAdmin.from('profiles').update({ avatar_url: pub.publicUrl }).eq('id', uid)
    if (updErr) return NextResponse.json({ ok: false, message: updErr.message }, { status: 400 })

    return NextResponse.json({ ok: true, avatar_url: pub.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

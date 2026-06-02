import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { CMS_TABLES, type CmsTable } from '@/lib/cms'

/**
 * CRUD générique du CMS (back-office) — schéma public, tables cms_*.
 *
 *   GET    /api/admin/cms/<resource>            → liste complète (tous statuts)
 *   POST   /api/admin/cms/<resource>  {fields}  → création
 *   PATCH  /api/admin/cms/<resource>  {id,...}  → mise à jour
 *   DELETE /api/admin/cms/<resource>  {id}      → suppression
 *
 * `resource` accepte « pages » ou « cms_pages » (préfixe ajouté au besoin).
 * Accès réservé au cookie de session admin. Écritures via service role.
 * En démo (Supabase non configuré) : renvoie { ok:true, demo:true }.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'

function resolveTable(resource: string): CmsTable | null {
  const name = (resource.startsWith('cms_') ? resource : `cms_${resource}`) as CmsTable
  return (CMS_TABLES as readonly string[]).includes(name) ? name : null
}

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  const table = resolveTable(params.resource)
  if (!table) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const orderCol = table === 'cms_settings' ? 'key' : 'sort_order'
    const { data, error } = await supabaseAdmin.from(table).select('*').order(orderCol, { ascending: true })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  const table = resolveTable(params.resource)
  if (!table) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis pour enregistrer.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    delete body.id; delete body.created_at; delete body.updated_at
    const { data, error } = await supabaseAdmin.from(table).insert(body).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  const table = resolveTable(params.resource)
  if (!table) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis pour enregistrer.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const keyCol = table === 'cms_settings' ? 'key' : 'id'
    const keyVal = body[keyCol]
    if (keyVal == null) return NextResponse.json({ ok: false, message: `${keyCol} requis.` }, { status: 400 })
    const patch = { ...body }; delete patch[keyCol]; delete patch.created_at; delete patch.updated_at
    const { data, error } = await supabaseAdmin.from(table).update(patch).eq(keyCol, keyVal).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  const table = resolveTable(params.resource)
  if (!table) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    const keyCol = table === 'cms_settings' ? 'key' : 'id'
    const keyVal = body[keyCol]
    if (keyVal == null) return NextResponse.json({ ok: false, message: `${keyCol} requis.` }, { status: 400 })
    const { error } = await supabaseAdmin.from(table).delete().eq(keyCol, keyVal)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

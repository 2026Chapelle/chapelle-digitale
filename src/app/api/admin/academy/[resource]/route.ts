import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'

/**
 * CRUD générique des tables `academy_*` (back-office Académie des Élus).
 *
 *   GET    /api/admin/academy/<resource>            → liste
 *   POST   /api/admin/academy/<resource>  {fields}  → création
 *   PATCH  /api/admin/academy/<resource>  {id,...}  → mise à jour
 *   DELETE /api/admin/academy/<resource>  {id}      → suppression
 *
 * `resource` accepte « modules » ou « academy_modules ». Liste blanche stricte.
 * Réservé au cookie admin ; écritures via service role. En démo : { ok, demo:true }.
 * Le CmsManager générique pilote tout via apiBase="/api/admin/academy".
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACADEMY_TABLES = [
  'academy_levels', 'academy_modules', 'academy_lessons', 'academy_quizzes',
  'academy_badges', 'academy_certificates', 'academy_diplomas', 'academy_results',
  'academy_enrollments', 'academy_progress', 'academy_quiz_attempts', 'academy_student_badges',
] as const
type AcademyTable = typeof ACADEMY_TABLES[number]

// Tables ordonnées par `ordre` (les autres par created_at desc).
const ORDERED = new Set<string>(['academy_levels', 'academy_modules', 'academy_lessons'])

function resolveTable(resource: string): AcademyTable | null {
  const name = (resource.startsWith('academy_') ? resource : `academy_${resource}`) as AcademyTable
  return (ACADEMY_TABLES as readonly string[]).includes(name) ? name : null
}

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  return null
}

/** CmsManager envoie sort_order ; les tables Académie utilisent `ordre`. */
function normalize(table: string, body: Record<string, any>): Record<string, any> {
  const out = { ...body }
  if (ORDERED.has(table) && out.sort_order !== undefined) {
    if (out.ordre === undefined) out.ordre = out.sort_order
    delete out.sort_order
  }
  return out
}

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  const table = resolveTable(params.resource)
  if (!table) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    const orderCol = ORDERED.has(table) ? 'ordre' : 'created_at'
    const { data, error } = await supabaseAdmin.from(table).select('*').order(orderCol, { ascending: ORDERED.has(table) })
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
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis (poussez la migration academy).' }, { status: 400 })
  try {
    const body = normalize(table, await req.json().catch(() => ({})))
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
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = normalize(table, await req.json().catch(() => ({})))
    const id = body.id
    if (id == null) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const patch = { ...body }; delete patch.id; delete patch.created_at; delete patch.updated_at
    const { data, error } = await supabaseAdmin.from(table).update(patch).eq('id', id).select().single()
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
    const { id } = await req.json().catch(() => ({}))
    if (id == null) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const { error } = await supabaseAdmin.from(table).delete().eq('id', id)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

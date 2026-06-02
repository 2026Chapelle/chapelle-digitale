import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * CRUD générique LMS (back-office) — gère le parcours de formation du disciple
 * sans SQL : formations, modules, parcours, certificats.
 *   GET / POST / PATCH / DELETE  /api/admin/lms/<resource>
 * Garde : cookie admin. Écritures via service role.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = ['formations', 'formation_modules', 'parcours', 'parcours_formations', 'certificats'] as const
import { isAdminRequest } from '@/lib/admin-auth'

function guard(req: NextRequest, resource: string): NextResponse | null {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (!(ALLOWED as readonly string[]).includes(resource)) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  return null
}
const orderCol = (r: string) => (r === 'certificats' ? 'delivre_le' : (r === 'formations' ? 'created_at' : 'ordre'))

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const d = guard(req, params.resource); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  const { data, error } = await supabaseAdmin.from(params.resource).select('*').order(orderCol(params.resource), { ascending: true })
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, data: data ?? [] })
}

export async function POST(req: NextRequest, { params }: { params: { resource: string } }) {
  const d = guard(req, params.resource); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  delete body.id; delete body.created_at; delete body.updated_at
  // Nettoie les champs vides optionnels (UUID/dates) pour éviter les erreurs de type.
  for (const k of Object.keys(body)) if (body[k] === '') body[k] = null
  const { data, error } = await supabaseAdmin.from(params.resource).insert(body).select().single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function PATCH(req: NextRequest, { params }: { params: { resource: string } }) {
  const d = guard(req, params.resource); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const patch = { ...body }; delete patch.id; delete patch.created_at; delete patch.updated_at
  for (const k of Object.keys(patch)) if (patch[k] === '') patch[k] = null
  const { data, error } = await supabaseAdmin.from(params.resource).update(patch).eq('id', body.id).select().single()
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}

export async function DELETE(req: NextRequest, { params }: { params: { resource: string } }) {
  const d = guard(req, params.resource); if (d) return d
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  const body = await req.json().catch(() => ({}))
  if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
  const { error } = await supabaseAdmin.from(params.resource).delete().eq('id', body.id)
  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Back-office DONS & OFFRANDES (Chariow).
 *
 *   GET    /api/admin/giving/products             → tous les produits
 *   POST   /api/admin/giving/products  {fields}   → créer
 *   PATCH  /api/admin/giving/products  {id,...}   → modifier
 *   DELETE /api/admin/giving/products  {id}       → supprimer
 *
 *   GET    /api/admin/giving/settings             → réglages widget (clé/valeur)
 *   PATCH  /api/admin/giving/settings  {key,value}→ upsert d'un réglage
 *
 *   GET    /api/admin/giving/log                  → 200 derniers logs (analytics)
 *
 * Aucune donnée bancaire. Accès réservé au cookie de session admin.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { isAdminRequest } from '@/lib/admin-auth'
const ALLOWED = ['products', 'settings', 'log'] as const

function guard(req: NextRequest): NextResponse | null {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  return null
}

export async function GET(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  const { resource } = params
  if (!ALLOWED.includes(resource as any)) return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  try {
    if (resource === 'products') {
      const { data, error } = await supabaseAdmin.from('giving_products').select('*').order('page').order('position')
      if (error) throw error
      return NextResponse.json({ ok: true, data: data ?? [] })
    }
    if (resource === 'settings') {
      const { data, error } = await supabaseAdmin.from('giving_widget_settings').select('*').order('key')
      if (error) throw error
      return NextResponse.json({ ok: true, data: data ?? [] })
    }
    // log
    const { data, error } = await supabaseAdmin.from('giving_transactions_log').select('*').order('created_at', { ascending: false }).limit(200)
    if (error) throw error
    return NextResponse.json({ ok: true, data: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  if (params.resource !== 'products') return NextResponse.json({ ok: false, message: 'Création non supportée.' }, { status: 400 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    delete body.id; delete body.created_at; delete body.updated_at
    if (!body.provider) body.provider = 'chariow'
    const { data, error } = await supabaseAdmin.from('giving_products').insert(body).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    if (params.resource === 'settings') {
      if (!body.key) return NextResponse.json({ ok: false, message: 'key requis.' }, { status: 400 })
      const { data, error } = await supabaseAdmin.from('giving_widget_settings')
        .upsert({ key: body.key, value: body.value, label: body.label }, { onConflict: 'key' }).select().single()
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, data })
    }
    if (params.resource === 'products') {
      if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
      const patch = { ...body }; delete patch.id; delete patch.created_at; delete patch.updated_at
      const { data, error } = await supabaseAdmin.from('giving_products').update(patch).eq('id', body.id).select().single()
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
      return NextResponse.json({ ok: true, data })
    }
    return NextResponse.json({ ok: false, message: 'Ressource inconnue.' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { resource: string } }) {
  const denied = guard(req); if (denied) return denied
  if (params.resource !== 'products') return NextResponse.json({ ok: false, message: 'Suppression non supportée.' }, { status: 400 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, message: 'Supabase requis.' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    if (!body.id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('giving_products').delete().eq('id', body.id)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

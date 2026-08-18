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
import { isNotifiableContent, notifyIfFirstPublish } from '@/lib/notifications/content'
import { applyHomeInstantToggle, isHomeInstantDesignated, HOME_INSTANT_DESTINATION } from '@/lib/podcast/admin-instant'

function resolveTable(resource: string): CmsTable | null {
  const name = (resource.startsWith('cms_') ? resource : `cms_${resource}`) as CmsTable
  return (CMS_TABLES as readonly string[]).includes(name) ? name : null
}

/**
 * Unicité du slot « L'Instant Citadelle » : un SEUL épisode peut porter `home_instant`.
 * Après avoir désigné `keepId`, on retire `home_instant` de tous les autres épisodes
 * qui l'auraient encore (le nouveau remplace l'ancien). Best-effort, jamais bloquant.
 */
async function enforceHomeInstantUniqueness(keepId: string): Promise<void> {
  const { data: others } = await supabaseAdmin
    .from('cms_podcasts')
    .select('id, destinations')
    .contains('destinations', [HOME_INSTANT_DESTINATION])
    .neq('id', keepId)
  for (const o of others ?? []) {
    const cleaned = (Array.isArray((o as { destinations?: unknown }).destinations)
      ? ((o as { destinations: unknown[] }).destinations as unknown[])
      : []
    ).filter((d) => d !== HOME_INSTANT_DESTINATION)
    await supabaseAdmin.from('cms_podcasts').update({ destinations: cleaned }).eq('id', (o as { id: string }).id)
  }
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
    let rows = data ?? []
    // Podcast : expose la case dérivée « Instant gratuit » (destination home_instant)
    // pour que l'admin la voie cochée sur l'épisode réellement désigné.
    if (table === 'cms_podcasts') {
      rows = rows.map((r: Record<string, unknown>) => ({ ...r, is_home_instant: isHomeInstantDesignated(r.destinations) }))
    }
    return NextResponse.json({ ok: true, data: rows })
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
    // Podcast : la case « Instant gratuit » (is_home_instant, virtuelle) est traduite en
    // destination home_instant AVEC garde-fou Premium (serveur, pas seulement UI).
    let enforceInstantUnique = false
    if (table === 'cms_podcasts' && 'is_home_instant' in body) {
      const isOn = body.is_home_instant === true
      delete body.is_home_instant
      const toggle = applyHomeInstantToggle({ isHomeInstant: isOn, accessLevel: body.access_level, destinations: body.destinations })
      if (!toggle.ok) return NextResponse.json({ ok: false, message: toggle.error }, { status: 400 })
      body.destinations = toggle.destinations
      enforceInstantUnique = isOn
    }
    const { data, error } = await supabaseAdmin.from(table).insert(body).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    // Slot unique : le nouvel Instant remplace tout ancien (best-effort).
    if (enforceInstantUnique && (data as { id?: string })?.id) {
      try { await enforceHomeInstantUniqueness((data as { id: string }).id) } catch { /* non bloquant */ }
    }
    // Contenu créé directement publié → notifier les membres (1re publication).
    try { await notifyIfFirstPublish(table, null, data) } catch { /* non bloquant */ }
    const out = table === 'cms_podcasts' && data
      ? { ...(data as Record<string, unknown>), is_home_instant: isHomeInstantDesignated((data as { destinations?: unknown }).destinations) }
      : data
    return NextResponse.json({ ok: true, data: out })
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
    // Pré-lecture du statut ANTÉRIEUR (uniquement pour les tables notifiables) afin
    // de détecter une transition brouillon → publié. Aucune surcharge ailleurs.
    let before: Record<string, any> | null = null
    if (isNotifiableContent(table)) {
      const { data: prev } = await supabaseAdmin.from(table).select('*').eq(keyCol, keyVal).maybeSingle()
      before = prev ?? null
    }
    // Podcast : case « Instant gratuit » → destination home_instant + garde-fou Premium
    // (serveur). access_level / destinations autoritatifs = patch sinon ligne existante.
    let enforceInstantUnique = false
    if (table === 'cms_podcasts' && 'is_home_instant' in patch) {
      const isOn = patch.is_home_instant === true
      delete patch.is_home_instant
      let accessLevel = patch.access_level
      let destinations = patch.destinations
      if (accessLevel === undefined || destinations === undefined) {
        const src = before ?? (await supabaseAdmin.from(table).select('access_level, destinations').eq(keyCol, keyVal).maybeSingle()).data
        if (accessLevel === undefined) accessLevel = (src as { access_level?: unknown } | null)?.access_level
        if (destinations === undefined) destinations = (src as { destinations?: unknown } | null)?.destinations
      }
      const toggle = applyHomeInstantToggle({ isHomeInstant: isOn, accessLevel, destinations })
      if (!toggle.ok) return NextResponse.json({ ok: false, message: toggle.error }, { status: 400 })
      patch.destinations = toggle.destinations
      enforceInstantUnique = isOn
    }
    const { data, error } = await supabaseAdmin.from(table).update(patch).eq(keyCol, keyVal).select().single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })
    if (enforceInstantUnique && (data as { id?: string })?.id) {
      try { await enforceHomeInstantUniqueness((data as { id: string }).id) } catch { /* non bloquant */ }
    }
    try { await notifyIfFirstPublish(table, before, data) } catch { /* non bloquant */ }
    const out = table === 'cms_podcasts' && data
      ? { ...(data as Record<string, unknown>), is_home_instant: isHomeInstantDesignated((data as { destinations?: unknown }).destinations) }
      : data
    return NextResponse.json({ ok: true, data: out })
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

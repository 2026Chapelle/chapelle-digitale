import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

/**
 * Centre de notifications MEMBRE — dérivé des données RÉELLES existantes.
 *   GET /api/member/notifications → { data: Notif[] }
 *
 * Aucune donnée fictive : on agrège les contenus réels récents (formations,
 * événements, lives/replays, enseignements, témoignages publiés) + les réponses
 * aux demandes de prière du membre. L'état lu/non-lu est géré côté client
 * (localStorage) — léger, sans écriture en base.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Notif = { id: string; type: string; title: string; summary: string; date: string; href: string; image?: string | null }

const iso = (s?: string | null) => (s ? String(s) : new Date(0).toISOString())

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })

  const out: Notif[] = []
  // Chaque source est isolée : une table absente ne casse jamais le centre.
  const tasks: Promise<void>[] = []

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('formations')
        .select('id, titre, slug, created_at').eq('statut', 'publie')
        .order('created_at', { ascending: false }).limit(10)
      for (const f of data || []) out.push({
        id: `formation:${f.id}`, type: 'formation', title: 'Nouvelle formation publiée',
        summary: f.titre || 'Formation', date: iso(f.created_at),
        href: f.slug ? `/member/dashboard/formations/${f.slug}` : '/member/dashboard/formations',
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('cms_events')
        .select('id, title, cover_url, created_at, starts_at').eq('status', 'published')
        .order('created_at', { ascending: false }).limit(10)
      for (const e of data || []) out.push({
        id: `evenement:${e.id}`, type: 'evenement', title: 'Nouvel événement',
        summary: e.title || 'Événement', date: iso(e.created_at || e.starts_at),
        href: '/member/dashboard/evenements', image: e.cover_url || null,
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('cms_lives')
        .select('id, title, cover_url, status, youtube_url, video_url, scheduled_at, created_at')
        .in('status', ['scheduled', 'live', 'ended', 'published'])
        .order('created_at', { ascending: false }).limit(10)
      for (const l of data || []) {
        const isReplay = l.status === 'ended' || (l.status === 'published' && (l.youtube_url || l.video_url))
        out.push({
          id: `live:${l.id}`, type: isReplay ? 'replay' : 'live',
          title: isReplay ? 'Nouveau replay disponible' : 'Nouveau live programmé',
          summary: l.title || 'Live', date: iso(l.created_at || l.scheduled_at),
          href: '/member/dashboard/lives', image: l.cover_url || null,
        })
      }
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('cms_teachings')
        .select('id, title, cover_url, created_at, published_at').eq('status', 'published')
        .order('created_at', { ascending: false }).limit(10)
      for (const t of data || []) out.push({
        id: `enseignement:${t.id}`, type: 'enseignement', title: 'Nouvel enseignement',
        summary: t.title || 'Enseignement', date: iso(t.published_at || t.created_at),
        href: '/enseignements', image: t.cover_url || null,
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('cms_testimonies')
        .select('id, title, author_name, created_at, status')
        .in('status', ['approved', 'published'])
        .order('created_at', { ascending: false }).limit(8)
      for (const t of data || []) out.push({
        id: `temoignage:${t.id}`, type: 'temoignage', title: 'Témoignage validé',
        summary: t.title || t.author_name || 'Un nouveau témoignage', date: iso(t.created_at),
        href: '/temoignages',
      })
    } catch { /* skip */ }
  })())

  // Réponses aux demandes de prière du membre.
  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('priere_demandes')
        .select('id, sujet, statut, updated_at, created_at').eq('user_id', sp.uid)
        .in('statut', ['reponse_recue', 'temoignage_soumis', 'temoignage_valide', 'traitee', 'en_priere'])
        .order('updated_at', { ascending: false }).limit(10)
      for (const p of data || []) out.push({
        id: `priere:${p.id}:${p.statut}`, type: 'priere', title: 'Suivi de votre demande de prière',
        summary: p.sujet || 'Votre demande a été prise en charge', date: iso(p.updated_at || p.created_at),
        href: '/member/dashboard/prieres',
      })
    } catch { /* skip */ }
  })())

  // Notifications CIBLÉES / DIFFUSÉES temps réel (source de vérité app_notifications).
  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('app_notifications')
        .select('id, type, title, body, href, created_at, user_id, audience')
        .or(`user_id.eq.${sp.uid},audience.in.(members,all)`)
        .order('created_at', { ascending: false }).limit(30)
      for (const n of data || []) out.push({
        id: `app:${n.id}`, type: n.type || 'info', title: n.title,
        summary: n.body || '', date: iso(n.created_at), href: n.href || '/member/dashboard/notifications',
      })
    } catch { /* skip */ }
  })())

  await Promise.allSettled(tasks)
  out.sort((a, b) => (a.date < b.date ? 1 : -1))
  const items = out.slice(0, 40)

  // État lu/archivé SERVEUR (multi-appareils) — par clé de notification.
  let reads: string[] = [], archived: string[] = []
  try {
    const { data } = await supabaseAdmin.from('notification_reads')
      .select('notif_key, read_at, archived_at').eq('user_id', sp.uid)
    reads = (data || []).filter((r: any) => r.read_at).map((r: any) => r.notif_key)
    archived = (data || []).filter((r: any) => r.archived_at).map((r: any) => r.notif_key)
  } catch { /* table absente → repli client localStorage */ }

  return NextResponse.json({ ok: true, data: items, reads, archived })
}

/**
 * Marque des notifications lues / archivées CÔTÉ SERVEUR (synchro multi-appareils).
 *   PATCH /api/member/notifications  body: { keys?: string[], all?: boolean, archive?: boolean }
 */
export async function PATCH(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch { /* */ }
  const keys: string[] = Array.isArray(body.keys) ? body.keys.filter((k: any) => typeof k === 'string').slice(0, 200) : []
  if (!keys.length) return NextResponse.json({ ok: true })
  const nowIso = new Date().toISOString()
  const rows = keys.map((k) => ({
    user_id: sp.uid, notif_key: k.slice(0, 256),
    read_at: nowIso, ...(body.archive ? { archived_at: nowIso } : {}),
  }))
  try {
    const { error } = await supabaseAdmin.from('notification_reads').upsert(rows, { onConflict: 'user_id,notif_key' })
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
  return NextResponse.json({ ok: true, count: rows.length })
}

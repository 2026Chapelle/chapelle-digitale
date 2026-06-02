import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

/**
 * Centre de notifications ADMIN — alertes RÉELLES dérivées des tables existantes.
 *   GET /api/admin/notifications → { data: Notif[] }
 *
 * Garde : cookie admin. Aucune donnée fictive. État lu/non-lu géré côté client.
 * Chaque source est isolée (try/catch) : une table absente ne casse rien.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
import { isAdminRequest } from '@/lib/admin-auth'

type Notif = { id: string; type: string; title: string; summary: string; date: string; href: string }
const iso = (s?: string | null) => (s ? String(s) : new Date(0).toISOString())

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })

  const out: Notif[] = []
  const tasks: Promise<void>[] = []

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('priere_demandes')
        .select('id, sujet, nom, created_at').order('created_at', { ascending: false }).limit(10)
      for (const p of data || []) out.push({
        id: `priere:${p.id}`, type: 'priere', title: 'Nouvelle demande de prière',
        summary: p.sujet || (p.nom ? `de ${p.nom}` : 'Demande reçue'), date: iso(p.created_at), href: '/admin/prieres',
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('contact_messages')
        .select('id, nom, sujet, created_at').order('created_at', { ascending: false }).limit(10)
      for (const m of data || []) out.push({
        id: `contact:${m.id}`, type: 'contact', title: 'Nouveau message de contact',
        summary: `${m.nom || 'Visiteur'}${m.sujet ? ` — ${m.sujet}` : ''}`, date: iso(m.created_at), href: '/admin/messages',
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('event_registrations')
        .select('id, event_titre, user_nom, type, created_at').order('created_at', { ascending: false }).limit(10)
      for (const r of data || []) out.push({
        id: `inscription:${r.id}`, type: 'inscription_evt',
        title: r.type === 'rappel' ? 'Nouveau rappel événement' : 'Nouvelle inscription événement',
        summary: `${r.user_nom || 'Membre'} — ${r.event_titre || 'Événement'}`, date: iso(r.created_at), href: '/admin/inscriptions',
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('cms_testimonies')
        .select('id, title, author_name, created_at').eq('status', 'submitted')
        .order('created_at', { ascending: false }).limit(10)
      for (const t of data || []) out.push({
        id: `temoignage:${t.id}`, type: 'temoignage', title: 'Nouveau témoignage à modérer',
        summary: t.title || t.author_name || 'Témoignage soumis', date: iso(t.created_at), href: '/admin/temoignages',
      })
    } catch { /* skip */ }
  })())

  tasks.push((async () => {
    try {
      const { data } = await supabaseAdmin.from('profiles')
        .select('id, prenom, nom, created_at').order('created_at', { ascending: false }).limit(8)
      for (const p of data || []) out.push({
        id: `membre:${p.id}`, type: 'membre', title: 'Nouvelle inscription membre',
        summary: `${p.prenom || ''} ${p.nom || ''}`.trim() || 'Nouveau compte', date: iso(p.created_at), href: '/admin/membres',
      })
    } catch { /* skip */ }
  })())

  // Dons (si une table de dons est disponible).
  tasks.push((async () => {
    for (const tbl of ['giving_transactions', 'giving_dons', 'dons']) {
      try {
        const { data, error } = await supabaseAdmin.from(tbl)
          .select('id, montant, created_at').order('created_at', { ascending: false }).limit(8)
        if (error) continue
        for (const d of data || []) out.push({
          id: `don:${tbl}:${d.id}`, type: 'don', title: 'Nouveau don enregistré',
          summary: d.montant != null ? `${Number(d.montant).toLocaleString('fr-FR')}` : 'Don reçu', date: iso(d.created_at), href: '/admin/dons',
        })
        break // première table valide uniquement
      } catch { /* table suivante */ }
    }
  })())

  await Promise.allSettled(tasks)
  out.sort((a, b) => (a.date < b.date ? 1 : -1))
  return NextResponse.json({ ok: true, data: out.slice(0, 30) })
}

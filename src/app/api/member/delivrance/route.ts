import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { sendEmail, emailLayout } from '@/lib/email'
import { APP_EMAIL } from '@/lib/constants'
import { siteUrl } from '@/lib/site-url'

/**
 * Centre de Délivrance & Cure d'Âme — espace membre (confidentiel).
 *   GET  → { demande (la sienne, la plus récente), ressources (publiées) }
 *   POST { sujet?, description?, diagnostic?, niveau?, parcours_recommande?, accompagnement? }
 *          → enregistre le diagnostic et/ou une demande d'accompagnement.
 *
 * Confidentialité : aucune donnée d'autrui n'est exposée ; les notes internes
 * pastorales ne transitent jamais vers le membre. Notification interne discrète.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, demande: null, ressources: [] })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const [{ data: demande }, { data: ressources }] = await Promise.all([
      supabaseAdmin.from('delivrance_demandes')
        .select('id, sujet, statut, niveau, parcours_recommande, created_at')
        .eq('user_id', sp.uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('delivrance_ressources')
        .select('id, type, titre, description, url, contenu, categorie, duree_minutes')
        .eq('status', 'published').order('ordre', { ascending: true }),
    ])
    return NextResponse.json({ ok: true, demande: demande ?? null, ressources: ressources ?? [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const row: Record<string, any> = {
      user_id: sp.uid,
      prenom: (body.prenom || '').toString().slice(0, 120) || null,
      email: (body.email || '').toString().slice(0, 160) || null,
      sujet: (body.sujet || 'Accompagnement spirituel').toString().slice(0, 200),
      description: (body.description || '').toString().slice(0, 4000) || null,
      diagnostic: body.diagnostic ?? null,
      niveau: body.niveau || null,
      parcours_recommande: body.parcours_recommande || null,
      statut: 'recu',
    }
    const { data, error } = await supabaseAdmin.from('delivrance_demandes').insert(row).select('id').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 400 })

    // Notification interne DISCRÈTE (aucun détail sensible dans l'email).
    if (body.accompagnement) {
      try {
        await sendEmail({
          to: process.env.ADMIN_NOTIFY_EMAIL || APP_EMAIL,
          subject: 'Nouvelle demande d\'accompagnement (Centre de cure d\'âme)',
          html: emailLayout({
            title: 'Demande d\'accompagnement reçue',
            body: '<p style="margin:0 0 12px">Une nouvelle demande confidentielle d\'accompagnement spirituel a été déposée. Merci de la prendre en charge dans le back-office (contenu réservé à l\'équipe pastorale).</p>',
            cta: { label: 'Ouvrir le Centre de cure d\'âme', href: siteUrl('/admin/delivrance') },
          }),
        })
      } catch { /* non bloquant */ }
    }
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { dispatch } from '@/lib/notifications/channels'
import { raisePastoralAlert, notifyWelcome, notifyNextStep, notifyCertificatePending } from '@/lib/notifications/events'
import { reminderKind, dedupKeys, nextEscalation } from '@/lib/notifications/rules'
import { computeEngagementScores } from '@/lib/pastoral/engagement-server'

/**
 * CRON — Notifications temporelles & alertes pastorales (idempotent, journalisé).
 *   GET|POST /api/cron/notifications   (secret : header x-cron-secret ou ?token=)
 *
 * Complète les notifications ÉVÉNEMENTIELLES (qui restent câblées aux actions).
 * À appeler périodiquement (cron PlanetHoster ou Supabase Scheduled). Chaque tâche
 * est isolée et anti-doublon (dedup_key / alerte ouverte unique).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BATCH = 200
const days = (n: number) => n * 86_400_000

export async function GET(req: NextRequest) { return run(req) }
export async function POST(req: NextRequest) { return run(req) }

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('token') || ''
  if (!secret || given !== secret) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const summary: Record<string, number> = {}
  const bump = (k: string, n = 1) => { summary[k] = (summary[k] || 0) + n }

  let runId: string | null = null
  try {
    const { data } = await supabaseAdmin.from('cron_runs').insert({ job: 'notifications', started_at: nowIso }).select('id').single()
    runId = data?.id ?? null
  } catch { /* table absente → on continue sans journal */ }

  const safe = async (label: string, fn: () => Promise<void>) => { try { await fn() } catch { bump(`${label}_error`) } }

  // 1) Rappels d'événements (J-7 / J-1 / imminent)
  await safe('events', async () => {
    const { data } = await supabaseAdmin.from('cms_events')
      .select('id, title, starts_at').eq('status', 'published')
      .gte('starts_at', nowIso).lte('starts_at', new Date(now + days(8)).toISOString()).limit(BATCH)
    for (const e of data || []) {
      const kind = e.starts_at ? reminderKind(new Date(e.starts_at).getTime(), now) : null
      if (!kind) continue
      await dispatch({ target: { audience: 'members' }, type: 'evenement', dedupKey: dedupKeys.event(e.id, kind),
        title: kind === 'imminent' ? 'Cela commence bientôt' : kind === 'j1' ? 'Demain' : 'Dans une semaine',
        body: e.title || 'Événement à venir', href: '/member/dashboard/evenements' })
      bump(`event_${kind}`)
    }
  })

  // 2) Rappels de lives
  await safe('lives', async () => {
    const { data } = await supabaseAdmin.from('cms_lives')
      .select('id, title, scheduled_at, status').in('status', ['scheduled', 'live'])
      .gte('scheduled_at', nowIso).lte('scheduled_at', new Date(now + days(8)).toISOString()).limit(BATCH)
    for (const l of data || []) {
      const kind = l.scheduled_at ? reminderKind(new Date(l.scheduled_at).getTime(), now) : null
      if (!kind) continue
      await dispatch({ target: { audience: 'members' }, type: 'live', dedupKey: dedupKeys.live(l.id, kind),
        title: kind === 'imminent' ? 'Live imminent 🔴' : kind === 'j1' ? 'Live demain' : 'Live dans une semaine',
        body: l.title || 'Direct à venir', href: '/member/dashboard/lives' })
      bump(`live_${kind}`)
    }
  })

  // 2b) Lives EN COURS → alerte « en direct maintenant » (son + bouton Rejoindre côté client)
  await safe('live_now', async () => {
    const { data } = await supabaseAdmin.from('cms_lives')
      .select('id, title, status').eq('status', 'live').limit(BATCH)
    for (const l of data || []) {
      await dispatch({ target: { audience: 'members' }, type: 'live_now', dedupKey: dedupKeys.live(l.id, 'now'),
        title: '🔴 En direct maintenant', body: l.title || 'Un live vient de commencer', href: '/member/dashboard/lives' })
      bump('live_now')
    }
  })

  // 3) Membres inactifs (> 30 jours) → alerte pastorale
  await safe('inactifs', async () => {
    const cutoff = new Date(now - days(30)).toISOString()
    const { data } = await supabaseAdmin.from('profiles')
      .select('id, prenom, nom, derniere_connexion').is('archived_at', null)
      .lt('derniere_connexion', cutoff).limit(BATCH)
    for (const m of data || []) {
      await raisePastoralAlert({ memberId: m.id, type: 'inactif', nowMs: now,
        title: 'Membre inactif', body: `${m.prenom || ''} ${m.nom || ''}`.trim() || 'Un membre est inactif depuis plus de 30 jours.' })
      bump('inactif')
    }
  })

  // 4) Progression arrêtée (inscription active, < 100 %, sans accès récent > 14 j)
  await safe('progression', async () => {
    const cutoff = new Date(now - days(14)).toISOString()
    const { data } = await supabaseAdmin.from('inscriptions_formation')
      .select('user_id, progression, statut, dernier_acces').eq('statut', 'actif')
      .lt('progression', 100).lt('dernier_acces', cutoff).limit(BATCH)
    const seen = new Set<string>()
    for (const i of data || []) {
      if (!i.user_id || seen.has(i.user_id)) continue
      seen.add(i.user_id)
      await raisePastoralAlert({ memberId: i.user_id, type: 'progression_arretee', nowMs: now,
        title: 'Progression à l\'arrêt', body: 'Aucune avancée de formation depuis plus de 2 semaines.' })
      bump('progression_arretee')
    }
  })

  // 5) Demandes de prière non traitées (> 3 jours)
  await safe('prieres', async () => {
    const cutoff = new Date(now - days(3)).toISOString()
    const { data } = await supabaseAdmin.from('priere_demandes')
      .select('user_id, sujet, statut, created_at').eq('statut', 'nouvelle')
      .not('user_id', 'is', null).lt('created_at', cutoff).limit(BATCH)
    for (const p of data || []) {
      await raisePastoralAlert({ memberId: p.user_id, type: 'priere_non_traitee', nowMs: now,
        title: 'Demande de prière en attente 🙏', body: p.sujet || 'Une demande attend une prise en charge.', href: '/admin/prieres' })
      bump('priere_non_traitee')
    }
  })

  // 6) Questions de formation sans réponse (> 3 jours)
  await safe('questions', async () => {
    const cutoff = new Date(now - days(3)).toISOString()
    const { data } = await supabaseAdmin.from('formation_questions')
      .select('user_id, question, statut, created_at').eq('statut', 'ouverte')
      .not('user_id', 'is', null).lt('created_at', cutoff).limit(BATCH)
    for (const q of data || []) {
      await raisePastoralAlert({ memberId: q.user_id, type: 'question_sans_reponse', nowMs: now,
        title: 'Question de formation sans réponse', body: String(q.question || '').slice(0, 80), href: '/admin/questions-formations' })
      bump('question_sans_reponse')
    }
  })

  // 7) Certificats non consultés (> 3 jours) → rappel membre
  await safe('certificats', async () => {
    const cutoff = new Date(now - days(3)).toISOString()
    const { data } = await supabaseAdmin.from('certificats')
      .select('user_id, titre, reference, delivre_le, consulte_le').is('consulte_le', null)
      .lt('delivre_le', cutoff).limit(BATCH)
    for (const c of data || []) {
      if (!c.user_id) continue
      await notifyCertificatePending(c.user_id, { titre: c.titre, reference: c.reference })
      bump('certificat_non_consulte')
    }
  })

  // 8) Profil incomplet (créé depuis > 7 j, sans tel/pays/ville)
  await safe('profil', async () => {
    const cutoff = new Date(now - days(7)).toISOString()
    const { data } = await supabaseAdmin.from('profiles')
      .select('id, telephone, pays, ville, date_inscription').is('archived_at', null)
      .lt('date_inscription', cutoff).limit(BATCH)
    for (const m of data || []) {
      if (m.telephone && m.pays && m.ville) continue
      await raisePastoralAlert({ memberId: m.id, type: 'profil_incomplet', nowMs: now,
        title: 'Profil incomplet', body: 'Coordonnées manquantes (téléphone / pays / ville).' })
      bump('profil_incomplet')
    }
  })

  // 9) Bienvenue (nouveaux < 24 h) — dedup welcome:uid
  await safe('welcome', async () => {
    const cutoff = new Date(now - days(1)).toISOString()
    const { data } = await supabaseAdmin.from('profiles')
      .select('id, prenom, date_inscription').gte('date_inscription', cutoff).limit(BATCH)
    for (const m of data || []) {
      await notifyWelcome(m.id, { prenom: m.prenom })
      await notifyNextStep(m.id, { label: "Commencez le Parcours Visiteur — Nouveau Croyant.", href: '/member/dashboard/parcours' })
      bump('welcome')
    }
  })

  // 10) Suivi pastoral en retard → escalade (alerte « nouvelle » > 7 j)
  await safe('escalade', async () => {
    const cutoff = new Date(now - days(7)).toISOString()
    const { data } = await supabaseAdmin.from('pastoral_alerts')
      .select('id, type, member_id, escalation_level').eq('status', 'nouvelle').lt('created_at', cutoff).limit(BATCH)
    for (const a of data || []) {
      const next = nextEscalation(a.escalation_level)
      if (next === a.escalation_level) continue
      await supabaseAdmin.from('pastoral_alerts').update({ escalation_level: next }).eq('id', a.id)
      await dispatch({ target: { audience: 'admin' }, type: 'systeme', dedupKey: `escalade:${a.id}:${next}`,
        title: 'Alerte pastorale escaladée', body: `Type « ${a.type} » non pris en charge → niveau ${next}.`, href: `/admin/membres/${a.member_id}` })
      bump('escalade')
    }
  })

  // 11) Persistance quotidienne du score d'engagement (P1 — écrit profiles.score_engagement)
  //     Réutilise la formule pure existante via le helper autonome ; écriture par lots de 500.
  await safe('engagement', async () => {
    const scores = await computeEngagementScores({ nowMs: now })
    const entries = Array.from(scores.entries())
    const WRITE_BATCH = 500
    for (let i = 0; i < entries.length; i += WRITE_BATCH) {
      const chunk = entries.slice(i, i + WRITE_BATCH)
      await Promise.all(chunk.map(([uid, score]) =>
        supabaseAdmin.from('profiles').update({ score_engagement: score }).eq('id', uid),
      ))
      bump('engagement_scored', chunk.length)
    }
  })

  if (runId) {
    try { await supabaseAdmin.from('cron_runs').update({ finished_at: new Date().toISOString(), ok: true, summary }).eq('id', runId) } catch { /* */ }
  }
  return NextResponse.json({ ok: true, summary })
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { parcoursGate } from '@/lib/formations/parcours-gate-server'
import { computeStatutUpgrade } from '@/lib/formations/statut-progression'
import { ensureIntegrationCertificate } from '@/lib/formations/integration-progress-server'
import { WATCH_THRESHOLD, hasPlayableVideo } from '@/lib/formations/video-validation'
import { can } from '@/lib/permissions'
import { notifyModuleCompleted, notifyParcoursCompleted, notifyStatusReached, notifyCertificate, notifyAcademieUnlocked } from '@/lib/notifications/events'

/**
 * Progression RÉELLE : marque un module terminé (ou l'annule) et recalcule la
 * progression de l'inscription. Aucun pourcentage fictif.
 *   POST   { module_id, formation_id }  → marque terminé
 *   DELETE { module_id }                → annule (reprendre)
 * Délivre un certificat (fondation) quand la formation atteint 100 %.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function recompute(uid: string, formationId: string) {
  const { count: total } = await supabaseAdmin
    .from('formation_modules').select('*', { count: 'exact', head: true })
    .eq('formation_id', formationId).eq('status', 'published')
  const { count: done } = await supabaseAdmin
    .from('module_completions').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('formation_id', formationId)
  const progression = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : 0
  const statut = progression >= 100 ? 'termine' : 'actif'
  await supabaseAdmin.from('inscriptions_formation')
    .update({ progression, statut, dernier_acces: new Date().toISOString() })
    .eq('user_id', uid).eq('formation_id', formationId)
  return { progression, statut, total: total ?? 0, done: done ?? 0 }
}

export async function POST(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { module_id, formation_id } = await req.json().catch(() => ({}))
    if (!module_id || !formation_id) return NextResponse.json({ ok: false, message: 'module_id + formation_id requis.' }, { status: 400 })

    // Override pédagogique : berger / admin ne sont pas bloqués par les verrous
    // d'ordre (inscription / parcours / prérequis). La validation 90 % reste due.
    const override = can({ role: sp.role, membre_statut: sp.profile?.membre_statut }, 'can_override_parcours_locks')

    // ── Garde-fous serveur (anti-contournement par appel API direct) ──────────
    // 1) Inscription obligatoire (aucune auto-inscription silencieuse).
    const { data: insc } = await supabaseAdmin.from('inscriptions_formation')
      .select('id').eq('user_id', sp.uid).eq('formation_id', formation_id).maybeSingle()
    if (!insc && !override) return NextResponse.json({ ok: false, message: 'Inscrivez-vous à ce parcours avant de valider un module.' }, { status: 403 })

    // 2) Verrou inter-parcours : parcours précédent terminé à 100 %.
    const gate = await parcoursGate(formation_id, sp.uid)
    if (gate.parcours_locked && !override) {
      const prev = gate.previous_formation?.titre || 'le parcours précédent'
      return NextResponse.json({ ok: false, message: `Terminez d'abord ${prev}.` }, { status: 403 })
    }

    // 3) Module valide, publié, avec contenu vidéo (pas « en préparation »), prérequis fait.
    const { data: mod } = await supabaseAdmin.from('formation_modules')
      .select('id, titre, status, prerequis_module_id, youtube_id, video_url, source_video, video_path')
      .eq('id', module_id).eq('formation_id', formation_id).maybeSingle()
    if (!mod || mod.status !== 'published') return NextResponse.json({ ok: false, message: 'Module introuvable.' }, { status: 404 })
    if (!hasPlayableVideo(mod)) return NextResponse.json({ ok: false, message: 'Module en préparation : validation indisponible.' }, { status: 403 })
    if (mod.prerequis_module_id && !override) {
      const { data: prereqDone } = await supabaseAdmin.from('module_completions')
        .select('id').eq('user_id', sp.uid).eq('module_id', mod.prerequis_module_id).maybeSingle()
      if (!prereqDone) return NextResponse.json({ ok: false, message: 'Terminez d\'abord le module précédent.' }, { status: 403 })
    }

    // 4) VALIDATION RÉELLE : visionnage ≥ 90 % (anti-contournement serveur).
    let okWatched = false
    try {
      const { data: vp } = await supabaseAdmin.from('video_progress')
        .select('percent_watched, completed').eq('user_id', sp.uid).eq('module_id', module_id).maybeSingle()
      okWatched = !!vp && (vp.completed || (vp.percent_watched ?? 0) >= WATCH_THRESHOLD)
    } catch { okWatched = false }
    if (!okWatched) return NextResponse.json({ ok: false, message: `Visionnez la vidéo à au moins ${WATCH_THRESHOLD}% pour valider ce module.` }, { status: 403 })

    await supabaseAdmin.from('module_completions')
      .upsert({ user_id: sp.uid, module_id, formation_id }, { onConflict: 'user_id,module_id', ignoreDuplicates: true })

    const res = await recompute(sp.uid, formation_id)
    const { data: f } = await supabaseAdmin.from('formations').select('titre, certifiant, slug').eq('id', formation_id).maybeSingle()

    // Notification : module terminé (temps réel, non bloquant).
    try { await notifyModuleCompleted(sp.uid, { moduleTitre: mod.titre, formationTitre: f?.titre, slug: f?.slug }) } catch { /* */ }

    // Certificat à 100 % — UNIQUEMENT pour les formations marquées « certifiantes ».
    if (res.progression >= 100) {
      try { await notifyParcoursCompleted(sp.uid, { formationTitre: f?.titre, slug: f?.slug }) } catch { /* */ }

      // Montée AUTOMATIQUE du statut membre (parcours d'intégration), monotone + historisée + notifiée.
      try {
        const cible = computeStatutUpgrade(sp.profile?.membre_statut, f?.slug)
        if (cible) {
          const ancien = sp.profile?.membre_statut ?? null
          const { error: upErr } = await supabaseAdmin.from('profiles').update({ membre_statut: cible }).eq('id', sp.uid)
          if (!upErr) {
            await supabaseAdmin.from('membre_statut_history').insert({
              user_id: sp.uid, ancien_statut: ancien, nouveau_statut: cible, source: `parcours:${f?.slug}`,
            })
            try { await notifyStatusReached(sp.uid, { statut: cible }) } catch { /* */ }
          }
        }
      } catch { /* non bloquant */ }

      if (f?.certifiant) {
        const { data: existing } = await supabaseAdmin.from('certificats')
          .select('id, reference').eq('user_id', sp.uid).eq('formation_id', formation_id).eq('type', 'formation').maybeSingle()
        if (!existing) {
          const rand = randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()
          const reference = `CITADELLE-${String(formation_id).slice(0, 8)}-${rand}`.toUpperCase()
          await supabaseAdmin.from('certificats').insert({
            user_id: sp.uid, formation_id, type: 'formation', titre: `Certificat — ${f?.titre || 'Formation'}`, reference,
          })
          try { await notifyCertificate(sp.uid, { titre: `Certificat — ${f?.titre || 'Formation'}`, reference }) } catch { /* */ }
        }
      }
    }

    // Certificat d'Intégration CIER — délivré quand TOUT le programme est validé. Idempotent, non bloquant.
    let integration_certificate: string | null = null
    try {
      integration_certificate = await ensureIntegrationCertificate(sp.uid)
      if (integration_certificate) {
        try { await notifyCertificate(sp.uid, { titre: "Certificat d'Intégration CIER", reference: integration_certificate }) } catch { /* */ }
        try { await notifyAcademieUnlocked(sp.uid) } catch { /* */ }
      }
    } catch { /* non bloquant */ }

    return NextResponse.json({ ok: true, data: { ...res, integration_certificate } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const { module_id, formation_id } = await req.json().catch(() => ({}))
    if (!module_id || !formation_id) return NextResponse.json({ ok: false, message: 'module_id + formation_id requis.' }, { status: 400 })
    await supabaseAdmin.from('module_completions').delete().eq('user_id', sp.uid).eq('module_id', module_id)
    const res = await recompute(sp.uid, formation_id)
    return NextResponse.json({ ok: true, data: res })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

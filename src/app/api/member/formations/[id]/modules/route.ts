import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'
import { parcoursGate } from '@/lib/formations/parcours-gate-server'
import { resolveVideoSource, hasPlayableVideo, resolveYouTubeId, youtubeThumbnail } from '@/lib/formations/video-validation'
import { can } from '@/lib/permissions'

/**
 * URL signée d'une vidéo interne (bucket privé media-videos). Repli sur le
 * bucket 'media' (transition) puis sur une URL directe éventuelle. Courte durée.
 */
async function signInternalVideo(path?: string | null, fallbackUrl?: string | null): Promise<string | null> {
  if (path) {
    for (const b of ['media-videos', 'media']) {
      try {
        const { data } = await supabaseAdmin.storage.from(b).createSignedUrl(path, 7200)
        if (data?.signedUrl) return data.signedUrl
      } catch { /* essaie le bucket suivant */ }
    }
  }
  return fallbackUrl || null
}

/**
 * Modules d'une formation pour le membre connecté + état de progression réel.
 *   GET /api/member/formations/<formationId>/modules
 * Renvoie chaque module avec `completed` (module_completions) et `locked`
 * (accès par statut + prérequis). Objectif : accompagner la transformation
 * du disciple, sans jamais exposer un contenu auquel il n'a pas droit.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Hiérarchie d'accès (du plus ouvert au plus exigeant).
const RANK: Record<string, number> = {
  public: 0, visiteur: 0,
  membre: 1, nouveau_membre: 1,
  membre_actif: 2,
  disciple: 3,
  leader: 4, leader_cellule: 4, berger: 5, pasteur: 6, admin: 9, super_admin: 9,
}
const levelOf = (s?: string) => RANK[s || ''] ?? 1

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true }, { status: 401 })
  const sp = await getSessionProfile()
  if (!sp) return NextResponse.json({ ok: false, message: 'Non authentifié.' }, { status: 401 })
  try {
    const memberLevel = Math.max(levelOf(sp.profile?.membre_statut), levelOf(sp.role))

    // Contexte de la formation : sert à reconnaître un parcours d'intégration,
    // ouvert aux visiteurs connectés (le parcours d'accueil ne doit jamais être verrouillé).
    const { data: formation } = await supabaseAdmin
      .from('formations')
      .select('id, slug, type, niveau, categorie')
      .eq('id', params.id)
      .maybeSingle()
    const haystack = [formation?.type, formation?.niveau, formation?.categorie, formation?.slug]
      .filter(Boolean).join(' ').toLowerCase()
    const isIntegration = /int[ée]gration|accueil|nouveau|premiers?\s*pas|d[ée]couv/.test(haystack)

    // Le membre est-il inscrit à cette formation ? Si oui, il peut ouvrir ses modules.
    const { data: insc } = await supabaseAdmin
      .from('inscriptions_formation')
      .select('id')
      .eq('user_id', sp.uid)
      .eq('formation_id', params.id)
      .maybeSingle()
    const isEnrolled = !!insc

    // Override pédagogique : berger / admin accèdent à TOUS les parcours sans verrou.
    const override = can({ role: sp.role, membre_statut: sp.profile?.membre_statut }, 'can_override_parcours_locks')

    // Un visiteur connecté + inscrit, ou tout parcours d'intégration, lève le verrou de statut.
    const bypassStatus = override || isEnrolled || isIntegration

    // Verrou inter-parcours (P1 → P2 → P3) — calculé AVANT pour piloter l'accès.
    const gate = await parcoursGate(params.id, sp.uid)
    const parcoursLocked = override ? false : gate.parcours_locked

    const { data: mods } = await supabaseAdmin
      .from('formation_modules')
      .select('*')
      .eq('formation_id', params.id)
      .eq('status', 'published')
      .order('ordre', { ascending: true })

    const { data: compl } = await supabaseAdmin
      .from('module_completions')
      .select('module_id, completed_at')
      .eq('user_id', sp.uid)
      .eq('formation_id', params.id)
    const done = new Map((compl || []).map((c: any) => [c.module_id, c.completed_at]))

    // Progression vidéo (reprise de lecture + % vu). Défensif : table peut être absente.
    let vpById = new Map<string, any>()
    try {
      const { data: vp } = await supabaseAdmin.from('video_progress')
        .select('module_id, percent_watched, last_position')
        .eq('user_id', sp.uid).eq('formation_id', params.id)
      vpById = new Map((vp || []).map((v: any) => [v.module_id, v]))
    } catch { /* pas de reprise si la table n'est pas encore appliquée */ }

    const modules = await Promise.all((mods || []).map(async (m: any) => {
      const accessOk = bypassStatus || memberLevel >= levelOf(m.acces_min_statut)
      const prereqOk = !m.prerequis_module_id || done.has(m.prerequis_module_id)
      const src = resolveVideoSource(m)                    // 'youtube' | 'internal' | 'none'
      const hasVideo = hasPlayableVideo(m)
      const hasPdf = !!m.pdf_url
      const isDone = done.has(m.id)
      // Verrouillé si : parcours précédent non terminé, non inscrit, statut
      // insuffisant, ou prérequis non validé. L'override (berger/admin) lève tout.
      const locked = override ? false : (parcoursLocked || !isEnrolled || !accessOk || !prereqOk)
      const lock_reason = override ? null
        : parcoursLocked ? 'parcours'
        : !isEnrolled ? 'inscription'
        : !accessOk ? 'statut'
        : (!prereqOk ? 'prerequis' : null)
      // Anti-contournement : ne JAMAIS exposer le contenu d'un module verrouillé.
      const reveal = !locked
      const v = vpById.get(m.id)
      // Vidéo interne : URL SIGNÉE générée à la volée (uniquement si débloqué).
      const internalUrl = (reveal && src === 'internal') ? await signInternalVideo(m.video_path, m.video_url) : null
      return {
        id: m.id, ordre: m.ordre, titre: m.titre, description: m.description,
        type: m.type,
        source_video: src,
        // ID YouTube dérivé (gère l'URL collée dans video_url) — jamais exposé si verrouillé.
        youtube_id: (reveal && src === 'youtube') ? resolveYouTubeId(m) : null,
        video_url: (reveal && src === 'internal') ? internalUrl : null,
        // Miniature (poster public) — gatée comme la vidéo : l'URL contient l'ID,
        // donc jamais exposée pour un module verrouillé (anti-contournement).
        thumbnail_url: reveal ? youtubeThumbnail(m) : null,
        // PDF déverrouillé UNIQUEMENT après validation du module (visionnage ≥ 90 %).
        pdf_url: (reveal && isDone) ? m.pdf_url : null,
        contenu_texte: reveal ? m.contenu_texte : null,
        duree_minutes: m.duree_minutes,
        acces_min_statut: m.acces_min_statut,
        // Métadonnées non sensibles.
        has_video: hasVideo,
        has_pdf: hasPdf,
        pdf_locked: hasPdf && reveal && !isDone,           // PDF présent mais module non validé
        video_percent: reveal ? (v?.percent_watched ?? 0) : 0,
        video_last_position: reveal ? (v?.last_position ?? 0) : 0,
        completed: isDone,
        completed_at: done.get(m.id) || null,
        locked,
        lock_reason,
      }
    }))

    const total = modules.length
    const completed = modules.filter((m) => m.completed).length
    const progression = total ? Math.round((completed / total) * 100) : 0

    return NextResponse.json({
      ok: true,
      data: {
        modules, total, completed, progression,
        enrolled: isEnrolled || override,
        parcours_locked: parcoursLocked,
        parcours_lock_reason: override ? null : gate.parcours_lock_reason,
        previous_formation: gate.previous_formation,
        next_formation: gate.next_formation,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

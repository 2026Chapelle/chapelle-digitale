import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { getSessionProfile } from '@/lib/member-auth'

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

    // Un visiteur connecté + inscrit, ou tout parcours d'intégration, lève le verrou de statut.
    const bypassStatus = isEnrolled || isIntegration

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

    const modules = (mods || []).map((m: any) => {
      const accessOk = bypassStatus || memberLevel >= levelOf(m.acces_min_statut)
      const prereqOk = !m.prerequis_module_id || done.has(m.prerequis_module_id)
      return {
        id: m.id, ordre: m.ordre, titre: m.titre, description: m.description,
        type: m.type, youtube_id: m.youtube_id, video_url: m.video_url, pdf_url: m.pdf_url,
        contenu_texte: m.contenu_texte, duree_minutes: m.duree_minutes,
        acces_min_statut: m.acces_min_statut,
        completed: done.has(m.id),
        completed_at: done.get(m.id) || null,
        locked: !accessOk || !prereqOk,
        lock_reason: !accessOk ? 'statut' : (!prereqOk ? 'prerequis' : null),
      }
    })

    const total = modules.length
    const completed = modules.filter((m) => m.completed).length
    const progression = total ? Math.round((completed / total) * 100) : 0

    return NextResponse.json({ ok: true, data: { modules, total, completed, progression } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

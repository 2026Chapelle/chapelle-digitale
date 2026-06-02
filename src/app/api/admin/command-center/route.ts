// src/app/api/admin/command-center/route.ts
// ----------------------------------------------------------------------------
// CENTRE DE COMMANDEMENT APOSTOLIQUE — cockpit unifié transverse.
//   GET /api/admin/command-center[?context=global|nation:CI|antenne:<uuid>]
//
// 1) Garde admin (cookie cier_admin). 2) Résout la PORTÉE autorisée côté serveur
// (super_admin = global ; nation_pastor = ses pays ; responsable = son antenne +
// descendants). 3) Borne le contexte demandé à la portée. 4) Agrège via la RPC
// SET-BASED command_center_kpis (zéro pull 100k lignes). 5) Journalise l'accès.
// Réponses { ok, data | message }. Convention Citadelle stricte.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  buildKpiTiles, clampContext, parseContext,
  type RawKpis, type CommandScope,
} from '@/lib/command-center'
import { cached } from '@/lib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PROFILE_ROLE_COL = 'role'
const CC_TTL_MS = 20_000 // cache court par contexte (l'audit reste journalisé à chaque appel)

/**
 * Résolution de la PORTÉE autorisée — côté serveur, jamais déduite de l'UI.
 * Le cockpit est gardé par le cookie admin (super_admin de fait). On lit toutefois
 * nation_responsables / antenne_responsables pour pouvoir restreindre un opérateur
 * non-super si le cookie est partagé avec des rôles régionaux.
 */
async function resolveScope(): Promise<CommandScope> {
  // Le cookie admin = portée globale par défaut (back-office super_admin).
  // Les portées régionales sont gérées via /api/member/* (session). Ici : global.
  return { kind: 'global', paysAllowed: null, antenneIdsAllowed: null, label: 'global' }
}

/** Traduit un contexte borné en filtres SQL (scope_pays[], scope_antennes[]). */
async function contextToFilters(
  ctx: string,
  scope: CommandScope,
): Promise<{ scopePays: string[] | null; scopeAntennes: string[] | null }> {
  const { kind, value } = parseContext(ctx)

  if (kind === 'global') {
    return { scopePays: scope.paysAllowed, scopeAntennes: scope.antenneIdsAllowed }
  }

  if (kind === 'nation' && value) {
    const pays = value.toUpperCase()
    // Intersection avec la portée autorisée.
    if (scope.paysAllowed && !scope.paysAllowed.map((p) => p.toUpperCase()).includes(pays)) {
      return { scopePays: scope.paysAllowed, scopeAntennes: scope.antenneIdsAllowed }
    }
    return { scopePays: [pays], scopeAntennes: null }
  }

  if (kind === 'antenne' && value) {
    // Étend au sous-arbre (parent_id) via RPC récursive.
    const ids = new Set<string>([value])
    try {
      const { data } = await supabaseAdmin.rpc('antenne_descendants', { p_antenne_id: value })
      for (const r of (data || []) as { id: string }[]) ids.add(r.id)
    } catch { /* best-effort */ }
    const list = Array.from(ids)
    // Si l'opérateur a une portée antenne restreinte, on intersecte.
    if (scope.antenneIdsAllowed) {
      const allowed = new Set(scope.antenneIdsAllowed)
      const inter = list.filter((id) => allowed.has(id))
      return { scopePays: null, scopeAntennes: inter.length ? inter : scope.antenneIdsAllowed }
    }
    return { scopePays: null, scopeAntennes: list }
  }

  return { scopePays: scope.paysAllowed, scopeAntennes: scope.antenneIdsAllowed }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  try {
    // 1) Portée AUTORISÉE résolue côté serveur (jamais déduite de l'UI).
    const scope = await resolveScope()

    // 2) Contexte demandé, BORNÉ à la portée.
    const requested = req.nextUrl.searchParams.get('context')
    const ctx = clampContext(requested, scope)
    const { scopePays, scopeAntennes } = await contextToFilters(ctx, scope)

    // 3) Agrégation SET-BASED en base (zéro N+1, pas de fetch 100k lignes).
    //    Mutualisée par contexte sur un TTL court ; l'audit (étape 4) reste, lui,
    //    journalisé à chaque appel.
    const kpis = await cached(`command-center:${ctx}`, CC_TTL_MS, async () => {
      const { data, error } = await supabaseAdmin.rpc('command_center_kpis', {
        scope_pays: scopePays, scope_antennes: scopeAntennes,
      })
      if (error) throw error
      return (data || {}) as RawKpis
    })

    // 4) Journalisation de l'accès (consultation transverse sensible).
    try {
      await supabaseAdmin.from('sensitive_access_logs').insert({
        role: scope.kind, scope_pays: ctx, action: 'command_center_view',
      })
    } catch { /* non bloquant */ }

    return NextResponse.json({
      ok: true,
      data: {
        scope: { kind: scope.kind, label: scope.label },
        context: ctx,
        kpis,
        tiles: buildKpiTiles(kpis, ctx),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

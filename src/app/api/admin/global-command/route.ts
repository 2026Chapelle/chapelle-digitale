// src/app/api/admin/global-command/route.ts
// ----------------------------------------------------------------------------
// CENTRE DE COMMANDEMENT APOSTOLIQUE GLOBAL (V5) — console mondiale.
//   GET /api/admin/global-command
//
// Orchestrateur : appelle les RPC SET-BASED des 9 capacités (vision, santé,
// finances, prédiction, gouvernement par antenne, crise, mission) en un seul
// aller-retour chacune, consolide les alertes des 6 sources, et calcule le
// pouls mondial via la logique PURE de global-intelligence.ts.
//
// Garde admin (cookie). Tout est défensif : une capacité absente (RPC non encore
// poussée) n'interrompt pas la console. Réponses { ok, data | message }.
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import {
  worldHealthIndex, rollupAlerts, globalPulse, toSeverite,
  type HealthRow, type GlobalAlert,
} from '@/lib/global-intelligence'
import { cached } from '@/lib/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GC_TTL_MS = 30_000 // la couche mondiale évolue lentement : cache un peu plus long

/** Appel RPC tolérant : renvoie data ou null (capacité non disponible). */
async function safeRpc<T = any>(fn: string, params?: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await supabaseAdmin.rpc(fn, params || {})
    if (error) return null
    return data as T
  } catch { return null }
}

/** Lecture tolérante d'une table d'alertes (best-effort, bornée). */
async function safeAlerts(
  table: string,
  map: (r: any) => GlobalAlert,
  filter?: (q: any) => any,
): Promise<GlobalAlert[]> {
  try {
    let q = supabaseAdmin.from(table).select('*').order('created_at', { ascending: false }).limit(50)
    if (filter) q = filter(q)
    const { data, error } = await q
    if (error) return []
    return (data || []).map(map)
  } catch { return [] }
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  }
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true })

  try {
    // Cache court : les 14 allers-retours (8 RPC + 6 lectures) + l'agrégat ne
    // sont pas repayés à chaque rafraîchissement de la console mondiale.
    const data = await cached('global-command:data', GC_TTL_MS, computeGlobalData)

    // Journalisation de l'accès — TOUJOURS (jamais court-circuitée par le cache).
    try {
      await supabaseAdmin.from('sensitive_access_logs').insert({
        role: 'global', scope_pays: 'monde', action: 'global_command_view',
      })
    } catch { /* non bloquant */ }

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

async function computeGlobalData() {
  {
    // 1) Capacités d'agrégation (chacune un aller-retour SET-BASED, en parallèle).
    const [world, crisis, missionPulse, missionCarte, finance, prediction, health, gouvernance] =
      await Promise.all([
        safeRpc<any>('world_overview', { p_scope_type: 'monde', p_scope_key: '*' }),
        safeRpc<any>('crisis_overview', { scope_pays: null }),
        safeRpc<any>('mission_pulse_kpis', { scope_pays: null, scope_antennes: null }),
        safeRpc<any>('mission_carte_monde', { p_scope_pays: null }),
        safeRpc<any[]>('finance_aggregate', {}),
        safeRpc<any[]>('predictions_aggregate', {}),
        safeRpc<any[]>('aggregate_spiritual_health', { p_scope: 'nation', p_depuis: '60 days' }),
        safeRpc<any[]>('antenne_governance_agg', { p_antenne_ids: null }),
      ])

    // 2) Indice de santé spirituelle mondiale (logique PURE).
    const healthRows: HealthRow[] = (health || []).map((r: any) => ({
      scope_key: r.scope_label || r.scope_ref || '—',
      membres: Number(r.effectif) || 0,
      niveaux: {
        tres_engage: Number(r.n_tres_engage) || 0,
        engage: Number(r.n_engage) || 0,
        stable: Number(r.n_stable) || 0,
        a_suivre: Number(r.n_a_suivre) || 0,
        en_risque: Number(r.n_en_risque) || 0,
        inactif: Number(r.n_inactif) || 0,
      },
    }))
    const sante = worldHealthIndex(healthRows)

    // 3) Consolidation des alertes des 6 sources → échelle de sévérité commune.
    const alertGroups = await Promise.all([
      safeAlerts('prophetic_alerts',
        (r) => ({ source: 'prophetique', severite: toSeverite(r.severite), titre: r.titre || r.type_alerte || 'Alerte prophétique', scope: r.scope_label || r.scope_id || 'monde', detail: r.message, created_at: r.created_at }),
        (q) => q.neq('statut', 'resolue')),
      safeAlerts('crisis_incidents',
        (r) => ({ source: 'crise', severite: toSeverite(r.severite), titre: r.titre || 'Incident', scope: r.pays || r.antenne_id || 'monde', detail: r.resume, created_at: r.created_at }),
        (q) => q.is('resolu_le', null)),
      safeAlerts('finance_anomaly_alerts',
        (r) => ({ source: 'finance', severite: toSeverite(r.severite), titre: `Anomalie financière (${r.type || '—'})`, scope: r.scope_id || 'monde', detail: r.detail, created_at: r.created_at }),
        (q) => q.neq('statut', 'resolue')),
      safeAlerts('spiritual_health_alerts',
        (r) => ({ source: 'sante', severite: toSeverite(r.severite), titre: r.type || 'Santé spirituelle', scope: r.scope_label || r.scope_ref || 'monde', detail: r.detail, created_at: r.created_at }),
        (q) => q.eq('resolu', false)),
      safeAlerts('growth_alerts',
        (r) => ({ source: 'croissance', severite: toSeverite(r.severite), titre: r.type || 'Croissance', scope: r.scope_key || 'monde', detail: r.detail, created_at: r.created_at }),
        (q) => q.eq('resolu', false)),
      safeAlerts('antenne_alertes',
        (r) => ({ source: 'antenne', severite: toSeverite(r.severite), titre: r.type || 'Antenne', scope: r.antenne_id || '—', detail: r.detail, created_at: r.created_at }),
        (q) => q.eq('resolue', false)),
    ])
    const alerts: GlobalAlert[] = alertGroups.flat()
    const rollup = rollupAlerts(alerts)
    const pouls = globalPulse(sante, alerts)

    return {
      pouls,
      sante,
      alertes: rollup,
      vision: world,
      crise: crisis,
      mission: { pulse: missionPulse, carte: missionCarte },
      finances: finance,
      prediction: Array.isArray(prediction) ? prediction[0] || null : prediction,
      gouvernance: gouvernance || [],
    }
  }
}

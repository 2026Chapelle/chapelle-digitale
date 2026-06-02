// src/lib/command-center.ts
// ----------------------------------------------------------------------------
// CENTRE DE COMMANDEMENT — logique PURE (sans I/O), testable & réutilisable.
// Transforme les compteurs bruts renvoyés par la RPC SQL command_center_kpis
// en tuiles KPI normalisées pour le cockpit, et borne le contexte demandé à la
// portée RBAC réellement autorisée. Aucune dépendance Supabase ici : la route
// /api/admin/command-center fournit les données et résout la portée serveur.
//
// Réutilise les conventions de pastoral-intelligence.ts (logique pure, FR).

export type CommandScopeKind = 'global' | 'nation' | 'antenne'

/** Portée AUTORISÉE d'un opérateur, résolue côté serveur (jamais par l'UI). */
export interface CommandScope {
  kind: CommandScopeKind
  paysAllowed: string[] | null        // null = toutes les nations (super_admin)
  antenneIdsAllowed: string[] | null  // null = toutes les antennes
  label: string                       // libellé du contexte courant (ex. 'nation:CI')
}

/** Compteurs bruts renvoyés par la RPC command_center_kpis (1 aller-retour). */
export interface RawKpis {
  membres_total: number
  nouveaux_30j: number
  membres_actifs: number
  dons_par_devise: Record<string, number>
  dons_count: number
  prieres_attente: number
  formations_actives: number
  evenements_a_venir: number
  achats_marketplace: number
  connectes_now: number
  visiteurs_aujourdhui: number
}

export type KpiTone = 'positif' | 'neutre' | 'attention'

export interface KpiTile {
  key: string
  label: string
  value: number | string
  detail?: string
  tone: KpiTone
  href: string // lien profond vers le module silo, pré-filtré par le contexte
}

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Number(n) || 0)

/** Total dons JAMAIS additionné entre devises : une chaîne par devise. */
export function fmtDevises(m: Record<string, number> | null | undefined): string {
  const entries = Object.entries(m || {})
  if (!entries.length) return '0 FCFA'
  return entries.map(([d, v]) => `${fmt(v)} ${d}`).join(' · ')
}

/**
 * Construit les tuiles KPI du cockpit. `ctx` est suffixé aux liens profonds
 * pour que chaque module silo s'ouvre déjà filtré par le contexte actif.
 */
export function buildKpiTiles(k: RawKpis, ctx: string): KpiTile[] {
  const q = ctx && ctx !== 'global' ? `?context=${encodeURIComponent(ctx)}` : ''
  return [
    { key: 'membres', label: 'Membres', value: fmt(k.membres_total),
      detail: `${fmt(k.membres_actifs)} actifs`, tone: 'neutre', href: `/admin/membres${q}` },
    { key: 'croissance', label: 'Nouveaux (30 j)', value: fmt(k.nouveaux_30j),
      tone: k.nouveaux_30j > 0 ? 'positif' : 'neutre', href: `/admin/gouvernement${q}` },
    { key: 'presence', label: 'Connectés', value: fmt(k.connectes_now),
      detail: `${fmt(k.visiteurs_aujourdhui)} visites aujourd'hui`, tone: 'positif', href: `/admin/analytics${q}` },
    { key: 'finances', label: 'Dons', value: fmtDevises(k.dons_par_devise),
      detail: `${fmt(k.dons_count)} dons complétés`, tone: 'neutre', href: `/admin/dons${q}` },
    { key: 'prieres', label: 'Prières en attente', value: fmt(k.prieres_attente),
      tone: k.prieres_attente > 0 ? 'attention' : 'positif', href: `/admin/prieres${q}` },
    { key: 'formations', label: 'Formations actives', value: fmt(k.formations_actives),
      tone: 'neutre', href: `/admin/formations${q}` },
    { key: 'evenements', label: 'Événements à venir', value: fmt(k.evenements_a_venir),
      tone: 'neutre', href: `/admin/evenements${q}` },
    { key: 'marketplace', label: 'Achats marketplace', value: fmt(k.achats_marketplace),
      tone: 'neutre', href: `/admin/marketplace${q}` },
  ]
}

/**
 * Restreint un contexte DEMANDÉ par l'UI à ce que la portée autorise réellement.
 * Un nation_pastor qui force 'nation:FR' hors de ses pays est ramené à sa portée.
 * Le contexte 'antenne:<id>' est validé côté serveur contre antenneIdsAllowed.
 */
export function clampContext(requested: string | null, scope: CommandScope): string {
  if (!requested || requested === 'global') {
    return scope.kind === 'global' ? 'global' : scope.label
  }
  if (requested.startsWith('nation:')) {
    const pays = requested.slice(7).toUpperCase()
    if (scope.paysAllowed === null ||
        scope.paysAllowed.map((p) => p.toUpperCase()).includes(pays)) {
      return `nation:${pays}`
    }
    return scope.kind === 'global' ? 'global' : scope.label
  }
  if (requested.startsWith('antenne:')) {
    // L'autorisation effective est vérifiée serveur (contextToFilters).
    return requested
  }
  return scope.kind === 'global' ? 'global' : scope.label
}

/** Découpe un contexte 'kind:value' en parties exploitables. */
export function parseContext(ctx: string): { kind: CommandScopeKind; value: string | null } {
  if (!ctx || ctx === 'global') return { kind: 'global', value: null }
  if (ctx.startsWith('nation:')) return { kind: 'nation', value: ctx.slice(7) }
  if (ctx.startsWith('antenne:')) return { kind: 'antenne', value: ctx.slice(8) }
  return { kind: 'global', value: null }
}

/** Compte les KPI marqués 'attention' (utilisé pour un badge d'alerte cockpit). */
export function attentionCount(tiles: KpiTile[]): number {
  return tiles.filter((t) => t.tone === 'attention').length
}

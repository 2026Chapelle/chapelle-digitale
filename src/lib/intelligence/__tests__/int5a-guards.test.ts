/**
 * CITADELLE INTELLIGENCE — 5A · GARDES ADVERSARIALES INDÉPENDANTES (AGENT 3)
 *
 * Revue croisée du travail des agents 1 & 2 par IMPORT des modules réels
 * (jamais de copie/mock du code testé) + scan textuel des composants cockpit.
 *
 * Ces gardes prouvent l'intégrité de la PREUVE :
 *  1. une donnée manquante ne peut pas fabriquer d'opportunité ;
 *  2. NO_DATA n'est jamais sérialisé/affiché comme un 0 (overview.ts) ;
 *  3. un vrai 0 (REAL_ZERO) reste réel ; UNAVAILABLE reste indisponible ;
 *  4. un problème d'hôte institutionnel est classé `institutional`, pas
 *     `citadelle` ;
 *  5. le contrat de preuve des opportunités est respecté ;
 *  6. le code SEO 5A ne référence PAS le connecteur Meta ;
 *  7. aucune chaîne « HUB-1/2/3/4 » visible dans les composants cockpit.
 *
 * Attendu : VERTES une fois l'intégration des agents 1&2 correcte. Une garde
 * rouge est un CONSTAT remonté au superviseur (Agent 3 ne corrige jamais les
 * fichiers d'autrui).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// Modules réels (import, pas de copie).
import { detectOpportunities } from '../seo/opportunities'
import { buildSeoOverview } from '../seo/overview'
import { classifyHost } from '../seo/scope'
import type {
  SearchConsoleData,
  Ga4Data,
  GscTotals,
  SeoConnectorStatus,
} from '../seo/types'

const ROOT = process.cwd()
const NOW = '2026-08-22T12:00:00.000Z'

/* ------------------------------------------------------------------ */
/* Fabriques d'entrée pour overview.ts (états réels du connecteur)     */
/* ------------------------------------------------------------------ */

const gscStatus = (state: SeoConnectorStatus['state']): SeoConnectorStatus => ({
  connector: 'google_search_console',
  state,
  configured: state === 'PASS',
  checkedAt: NOW,
})

const ga4Off: Ga4Data = {
  status: {
    connector: 'google_analytics',
    state: 'NOT_CONFIGURED',
    configured: false,
    checkedAt: NOW,
  },
  organic: null,
}

const scData = (totals: GscTotals | null, state: SeoConnectorStatus['state'] = 'PASS'): SearchConsoleData => ({
  status: gscStatus(state),
  totals,
  queries: [],
  pages: [],
  indexation: [],
  sitemaps: [],
})

/** Totaux « connecté mais aucune ligne observée » (ce que produit le connecteur). */
const ZERO_TOTALS: GscTotals = {
  clicks: 0,
  impressions: 0,
  ctr: 0,
  position: 0,
  activeQueries: 0,
  visiblePages: 0,
}

const cardBy = (cards: ReturnType<typeof buildSeoOverview>, key: string) =>
  cards.find((c) => c.key === key)

/* ------------------------------------------------------------------ */
/* 1. Donnée manquante ⇏ opportunité                                   */
/* ------------------------------------------------------------------ */

describe('5A-guard · une donnée manquante ne fabrique pas d’opportunité', () => {
  it('entrée vide → aucune opportunité', () => {
    expect(detectOpportunities({})).toEqual([])
  })

  it('connecteurs branchés mais aucune ligne → aucune opportunité', () => {
    expect(
      detectOpportunities({ queries: [], pages: [], indexation: [], sitemaps: [], technical: null }),
    ).toEqual([])
  })
})

/* ------------------------------------------------------------------ */
/* 2 & 3. NO_DATA ≠ 0 ; REAL_ZERO préservé ; UNAVAILABLE préservé      */
/* ------------------------------------------------------------------ */

describe('5A-guard · disponibilité honnête (overview.ts)', () => {
  it('connecté SANS lignes → position/CTR = no_data + valeur null (jamais un 0 réel)', () => {
    // Le connecteur renvoie PASS + totaux à zéro pour un dataset vide : cela ne
    // doit JAMAIS se présenter comme une position 0,0 ou un CTR 0 % « réels ».
    const cards = buildSeoOverview({ gsc: scData(ZERO_TOTALS), ga4: ga4Off, nowIso: NOW })
    const pos = cardBy(cards, 'position')
    const ctr = cardBy(cards, 'ctr')
    expect(pos).toBeDefined()
    expect(ctr).toBeDefined()
    expect(pos!.availability).toBe('no_data')
    expect(pos!.value).toBeNull()
    expect(ctr!.availability).toBe('no_data')
    expect(ctr!.value).toBeNull()
  })

  it('REAL_ZERO préservé : 0 clic AVEC impressions réelles reste réel', () => {
    // clics=0 mais impressions=500 = zéro RÉEL (page vue, jamais cliquée).
    const realZeroTotals: GscTotals = {
      clicks: 0,
      impressions: 500,
      ctr: 0,
      position: 8.2,
      activeQueries: 12,
      visiblePages: 5,
    }
    const cards = buildSeoOverview({ gsc: scData(realZeroTotals), ga4: ga4Off, nowIso: NOW })
    const clicks = cardBy(cards, 'clicks')
    expect(clicks!.availability).toBe('real')
    expect(clicks!.value).toBe(0)
  })

  it('UNAVAILABLE préservé : connecteur non configuré → unavailable + null', () => {
    const cards = buildSeoOverview({ gsc: scData(null, 'NOT_CONFIGURED'), ga4: ga4Off, nowIso: NOW })
    for (const key of ['clicks', 'impressions', 'ctr', 'position']) {
      const c = cardBy(cards, key)
      expect(c!.availability).toBe('unavailable')
      expect(c!.value).toBeNull()
    }
    const ga4 = cardBy(cards, 'ga4_organic')
    expect(ga4!.availability).toBe('unavailable')
    expect(ga4!.value).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* 4. Institutionnel ≠ Citadelle                                       */
/* ------------------------------------------------------------------ */

describe('5A-guard · portée institutionnelle jamais confondue avec Citadelle', () => {
  it('classifyHost : institutionnel = institutional, sous-domaine = citadelle', () => {
    expect(classifyHost('chapelleduroyaume.org')).toBe('institutional')
    expect(classifyHost('www.chapelleduroyaume.org')).toBe('institutional')
    expect(classifyHost('citadelle.chapelleduroyaume.org')).toBe('citadelle')
    // Hôte inconnu : jamais « citadelle » par défaut.
    expect(classifyHost('exemple.com')).toBe('external_or_unknown')
  })

  it('SITEMAP_ISSUE du sitemap_index institutionnel → scope institutional', () => {
    const out = detectOpportunities({
      sitemaps: [{ path: 'https://chapelleduroyaume.org/sitemap_index.xml', errors: 4 }],
    })
    const s = out.find((o) => o.kind === 'SITEMAP_ISSUE')
    expect(s).toBeDefined()
    expect(s!.scope).toBe('institutional')
    expect(s!.scope).not.toBe('citadelle')
    expect(s!.evidence).toContain('chapelleduroyaume.org')
  })
})

/* ------------------------------------------------------------------ */
/* 5. Contrat de preuve des opportunités                               */
/* ------------------------------------------------------------------ */

describe('5A-guard · contrat de preuve des opportunités', () => {
  const out = detectOpportunities({
    queries: [
      { query: 'faible ctr', clicks: 1, impressions: 900, ctr: 0.001, position: 4 },
    ],
    pages: [
      {
        page: 'https://citadelle.chapelleduroyaume.org/formations',
        clicks: 2,
        impressions: 200,
        ctr: 0.01,
        position: 11,
        trend: 'down',
        delta: -0.6,
      },
    ],
    sitemaps: [{ path: 'https://chapelleduroyaume.org/sitemap_index.xml', errors: 2 }],
  })

  it('chaque opportunité a source + subject + evidence + action', () => {
    expect(out.length).toBeGreaterThan(0)
    for (const o of out) {
      expect((o.source ?? '').length).toBeGreaterThan(0)
      expect(o.subject.trim().length).toBeGreaterThan(0)
      expect(o.evidence.trim().length).toBeGreaterThan(0)
      expect(o.action.trim().length).toBeGreaterThan(0)
    }
  })

  it('host + scope présents dès que le sujet est (ou dérive d’) une URL', () => {
    const urlLike = out.filter((o) => /^https?:\/\//i.test(o.subject) || o.host !== undefined)
    expect(urlLike.length).toBeGreaterThan(0)
    for (const o of urlLike) {
      expect(o.host).toBeTruthy()
      expect(o.scope).toBeTruthy()
    }
  })
})

/* ------------------------------------------------------------------ */
/* 6. Meta intouché par le code SEO 5A                                 */
/* ------------------------------------------------------------------ */

describe('5A-guard · aucun couplage au connecteur Meta', () => {
  it('seo/opportunities.ts n’importe aucun module Meta', () => {
    const src = readFileSync(join(ROOT, 'src/lib/intelligence/seo/opportunities.ts'), 'utf8')
    const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l))
    for (const line of importLines) {
      expect(/connectors\/meta|['"][^'"]*meta[^'"]*['"]/i.test(line)).toBe(false)
    }
  })
})

/* ------------------------------------------------------------------ */
/* 7. Aucune chaîne « HUB-1/2/3/4 » visible (hors commentaires)        */
/* ------------------------------------------------------------------ */

// Retire les commentaires (bloc et ligne) pour ne scanner que le texte visible.
// La regex de commentaire-ligne protège `://` (protocoles d'URL).
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

function collectComponentFiles(): string[] {
  const dir = join(ROOT, 'src/components/admin/intelligence')
  const files: string[] = []
  const walk = (d: string) => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.name.endsWith('.tsx')) files.push(p)
    }
  }
  walk(dir)
  files.push(join(ROOT, 'src/app/(admin)/admin/intelligence/page.tsx'))
  return files
}

describe('5A-guard · pas de jargon « HUB-x » visible dans le cockpit', () => {
  it('aucun composant intelligence n’expose « HUB-1/2/3/4 » hors commentaire', () => {
    const offenders: string[] = []
    for (const file of collectComponentFiles()) {
      const visible = stripComments(readFileSync(file, 'utf8'))
      if (/HUB-[1-4]/.test(visible)) offenders.push(file)
    }
    expect(offenders).toEqual([])
  })
})

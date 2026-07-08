/**
 * Assistant Pastoral — Intent Router 100 % DÉTERMINISTE (V2.5-B.2-B-①).
 *
 * Transforme une question en langage naturel (FR) en UN intent d'une liste FERMÉE,
 * par correspondance de mots-clés normalisés. AUCUN LLM, AUCUNE IA externe, AUCUN
 * appel réseau, AUCUN SQL. Fonction PURE (testable). Si rien ne correspond avec
 * certitude → intent `unknown` (jamais d'invention).
 *
 * Le texte utilisateur ne sert QU'À choisir un intent parmi une liste fixe ; il
 * n'atteint jamais une requête base de données ni une fonction d'accès arbitraire.
 */

export type AssistantIntent =
  | 'rapport_global'
  | 'suivis_prioritaires'
  | 'nouveaux_venus'
  | 'non_assignes'
  | 'conversions_a_verifier'
  | 'limites_donnees'
  | 'unknown'

export interface IntentMatch {
  intent: AssistantIntent
  confidence: 'sure' | 'weak'
  matched: string[]
}

/** Normalisation PURE : minuscules, sans accents, sans ponctuation, espaces simples. */
export function normalizeQuestion(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // diacritiques (accents)
    .replace(/[^a-z0-9\s]/g, ' ')     // ponctuation
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Règles ordonnées (la PREMIÈRE qui correspond gagne).
 * L'ordre encode la priorité de désambiguïsation : les intents les plus spécifiques
 * passent avant les plus généraux. Ex. « nouveaux venus sans responsable » → non_assignes
 * (car `non_assignes` est évalué avant `nouveaux_venus`).
 */
interface Rule {
  intent: Exclude<AssistantIntent, 'unknown'>
  triggers?: string[]  // n'importe lequel présent → match
  all?: string[]       // TOUS présents (ordre libre) → match (co-occurrence)
}

const RULES: Rule[] = [
  { intent: 'limites_donnees', triggers: [
    'donnees indisponibles', 'donnee indisponible', 'donnees manquantes', 'donnees absentes',
    'quelles donnees', 'limites des donnees', 'limites de donnees', 'que ne sais tu pas',
    'par zone', 'par ville', 'par pays', 'par region', 'par territoire', 'par localite',
  ] },
  { intent: 'conversions_a_verifier', all: ['conversion', 'verif'], triggers: [
    'converti sans profil', 'conversion sans profil', 'profil non lie',
  ] },
  { intent: 'non_assignes', triggers: [
    'sans responsable', 'non assigne', 'non assignes', 'pas de responsable', 'sans berger',
    'sans assignation', 'personnes sans responsable',
  ] },
  { intent: 'suivis_prioritaires', triggers: [
    'suivre en priorite', 'suivi prioritaire', 'suivis prioritaires', 'priorite', 'prioritaire',
    'qui dois je suivre', 'qui suivre', 'a suivre',
  ] },
  { intent: 'nouveaux_venus', triggers: [
    'nouveaux venus', 'nouveau venu', 'arrivants', 'arrivees', 'arrivee cette semaine',
    'recemment arrive', 'qui a rejoint', 'qui est arrive',
  ] },
  { intent: 'rapport_global', triggers: [
    'rapport', 'synthese', 'resume', 'bilan', 'recommandation', 'recommandations', 'point de la semaine',
  ] },
]

/** Déclencheurs « faibles » : n'engagent un intent que faute de mieux (confidence weak). */
const WEAK_RULES: { intent: Exclude<AssistantIntent, 'unknown'>; triggers: string[] }[] = [
  { intent: 'rapport_global', triggers: ['cette semaine', 'semaine', 'etat', 'situation'] },
]

export function routeIntent(question: string): IntentMatch {
  const q = normalizeQuestion(question)
  if (!q) return { intent: 'unknown', confidence: 'weak', matched: [] }

  for (const rule of RULES) {
    const matched: string[] = []
    if (rule.all && rule.all.every((t) => q.includes(t))) matched.push(...rule.all)
    if (rule.triggers) matched.push(...rule.triggers.filter((t) => q.includes(t)))
    if (matched.length) return { intent: rule.intent, confidence: 'sure', matched: Array.from(new Set(matched)) }
  }
  for (const rule of WEAK_RULES) {
    const matched = (rule.triggers || []).filter((t) => q.includes(t))
    if (matched.length) return { intent: rule.intent, confidence: 'weak', matched }
  }
  return { intent: 'unknown', confidence: 'weak', matched: [] }
}

/**
 * Intents qui NÉCESSITENT la lecture des demandes (allow-list de l'accès données).
 * `unknown` et `limites_donnees` en sont volontairement EXCLUS : ils ne déclenchent
 * aucune lecture base et ne renvoient aucune personne (garantie anti-hallucination).
 */
export const DATA_INTENTS: ReadonlySet<AssistantIntent> = new Set<AssistantIntent>([
  'rapport_global', 'suivis_prioritaires', 'nouveaux_venus', 'non_assignes', 'conversions_a_verifier',
])

/** Questions d'exemple proposées à l'utilisateur (chips) — toutes routables ci-dessus. */
export const SUGGESTED_QUESTIONS: string[] = [
  'Fais-moi un rapport pastoral de cette semaine.',
  'Qui dois-je suivre en priorité ?',
  'Montre-moi les nouveaux venus sans responsable.',
  'Quelles conversions doivent être vérifiées ?',
  'Quelles recommandations pastorales proposes-tu ?',
  'Quelles données sont indisponibles ?',
]

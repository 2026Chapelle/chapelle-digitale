/**
 * LB-SEC-2 — Résolution PURE de la destination du Livret d'Accueil.
 *
 * Le Livret est un document canonique (cms_media, type='pdf'). Son ID canonique
 * est la source de vérité — jamais une URL Storage. `/livret-accueil` redirige
 * vers le reader gaté /lecture/pdf/[id] (contrôle d'accès + URL signée à l'ouverture).
 */
export const LIVRET_ACCUEIL_DOCUMENT_ID = 'a27ccf64-d04d-4096-ad7f-3ff1f8b2bdee'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type LivretTarget =
  | { type: 'reader'; path: string }   // /lecture/pdf/[id] — gaté, aucune URL Storage
  | { type: 'external'; url: string }  // URL legacy http(s) explicitement configurée

/**
 * Décision PURE de destination (testable). Priorité :
 *  1) réglage = ID de document canonique → reader gaté ;
 *  2) réglage = URL http(s) legacy explicite → on la respecte (compat) ;
 *  3) défaut (rien / non concluant) → document canonique via reader gaté.
 * N'introduit JAMAIS d'URL publique par défaut.
 */
export function pickLivretTarget(settingValue: unknown, defaultId = LIVRET_ACCUEIL_DOCUMENT_ID): LivretTarget {
  const raw = typeof settingValue === 'string'
    ? settingValue
    : (settingValue && typeof settingValue === 'object' && 'url' in (settingValue as Record<string, unknown>)
        ? (settingValue as Record<string, unknown>).url
        : null)
  const s = raw ? String(raw).replace(/^"|"$/g, '').trim() : ''
  if (UUID_RE.test(s)) return { type: 'reader', path: `/lecture/pdf/${s}` }
  if (/^https?:\/\//i.test(s)) return { type: 'external', url: s }
  return { type: 'reader', path: `/lecture/pdf/${defaultId}` }
}

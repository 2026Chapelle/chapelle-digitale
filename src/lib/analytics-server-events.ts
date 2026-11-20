import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Événements métier écrits CÔTÉ SERVEUR dans public.analytics_events (P0 L1).
 *
 * - Activés uniquement par INTEL_SERVER_EVENTS=1 (défaut : coupé, aucune écriture).
 * - Idempotents : clé déterministe `<type>:<id entité>` portée par la session
 *   réservée `srv:<clé>` (pré-contrôle ici ; index unique partiel prévu en L2,
 *   dont la violation 23505 est traitée comme un doublon).
 * - Jamais bloquants : aucune exception ne remonte à l'appelant ; délai borné.
 * - Sans donnée personnelle : uniquement des identifiants techniques (UUID/id).
 *
 * Le préfixe `srv:` et les marqueurs `meta.origin` / `meta.idem_key` sont
 * réservés : la route publique /api/analytics/track les refuse ou les retire.
 */

export type ServerEventKind = 'signup_complete' | 'lead_created' | 'newcomer_created'

const SPEC: Record<ServerEventKind, { prefix: string; category: string }> = {
  signup_complete: { prefix: 'signup', category: 'inscription' },
  lead_created: { prefix: 'lead', category: 'lead' },
  newcomer_created: { prefix: 'newcomer', category: 'nouveau_venu' },
}

export const SERVER_SESSION_PREFIX = 'srv:'
export const SERVER_EVENT_ORIGIN = 'server'
const RESERVED_META_KEYS = ['origin', 'idem_key'] as const
const ENTITY_ID_RE = /^[A-Za-z0-9_-]{1,128}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_TIMEOUT_MS = 2000

export interface ServerEventInput {
  kind: ServerEventKind
  /** Identifiant technique de l'entité (UUID profil, id membre, id fiche). */
  entityId: string
  /** UUID du profil concerné, s'il existe (sinon null). */
  userId?: string | null
  path?: string | null
  /** Date réelle du fait métier (ISO). Défaut : maintenant (côté base). */
  occurredAt?: string | null
  /** Métadonnées techniques non personnelles (ex. organization_id). */
  meta?: Record<string, unknown>
}

export type ServerEventStatus = 'disabled' | 'invalid' | 'inserted' | 'duplicate' | 'error'

export function serverEventsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.INTEL_SERVER_EVENTS === '1'
}

export function idempotencyKey(kind: ServerEventKind, entityId: string): string | null {
  const spec = SPEC[kind]
  if (!spec || typeof entityId !== 'string' || !ENTITY_ID_RE.test(entityId)) return null
  return `${spec.prefix}:${entityId}`
}

export function isReservedSessionKey(key: unknown): boolean {
  return typeof key === 'string' && key.trim().toLowerCase().startsWith(SERVER_SESSION_PREFIX)
}

/** Métadonnées client : objet simple uniquement, marqueurs serveur retirés. */
export function sanitizeClientMeta(meta: unknown): Record<string, unknown> | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  const out: Record<string, unknown> = { ...(meta as Record<string, unknown>) }
  for (const k of RESERVED_META_KEYS) delete out[k]
  return out
}

export function buildServerEventRow(input: ServerEventInput) {
  const idem = idempotencyKey(input.kind, input.entityId)
  if (!idem) return null
  const extra = sanitizeClientMeta(input.meta) || {}
  const occurred = input.occurredAt && !Number.isNaN(Date.parse(input.occurredAt)) ? new Date(input.occurredAt).toISOString() : null
  return {
    session_key: `${SERVER_SESSION_PREFIX}${idem}`,
    user_id: input.userId && UUID_RE.test(input.userId) ? input.userId : null,
    type: 'conversion',
    category: SPEC[input.kind].category,
    path: input.path ? String(input.path).slice(0, 256) : null,
    label: input.kind,
    value: null,
    pays: null,
    meta: { ...extra, origin: SERVER_EVENT_ORIGIN, event: input.kind, idem_key: idem, v: 1 },
    ...(occurred ? { created_at: occurred } : {}),
  }
}

/** Vrai uniquement pour une inscription écrite par le serveur (non falsifiable via /track). */
export function isServerSignupEvent(e: { type?: unknown; category?: unknown; session_key?: unknown; meta?: unknown }): boolean {
  const meta = (e.meta && typeof e.meta === 'object' ? e.meta : {}) as Record<string, unknown>
  return e.type === 'conversion'
    && e.category === 'inscription'
    && typeof e.session_key === 'string'
    && e.session_key.startsWith(`${SERVER_SESSION_PREFIX}signup:`)
    && meta.origin === SERVER_EVENT_ORIGIN
}

type MinimalClient = { from: (table: string) => any }

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

export async function recordServerEvent(
  input: ServerEventInput,
  deps: { client?: MinimalClient; env?: NodeJS.ProcessEnv; timeoutMs?: number } = {},
): Promise<{ status: ServerEventStatus }> {
  if (!serverEventsEnabled(deps.env ?? process.env)) return { status: 'disabled' }
  const row = buildServerEventRow(input)
  if (!row) return { status: 'invalid' }
  const client = deps.client ?? (supabaseAdmin as unknown as MinimalClient)
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS
  try {
    return await withTimeout((async () => {
      const { data: found } = await client.from('analytics_events').select('id').eq('session_key', row.session_key).limit(1)
      if (Array.isArray(found) && found.length > 0) return { status: 'duplicate' as const }
      const { error } = await client.from('analytics_events').insert(row)
      if (!error) return { status: 'inserted' as const }
      if (error.code === '23505') return { status: 'duplicate' as const }
      console.warn('[intel] événement serveur non enregistré', input.kind, error.code || 'sql')
      return { status: 'error' as const }
    })(), timeoutMs)
  } catch (e) {
    console.warn('[intel] événement serveur non enregistré', input.kind, e instanceof Error && e.message === 'timeout' ? 'timeout' : 'exception')
    return { status: 'error' }
  }
}

import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { RETREAT_DAY_CONTENT_FIELDS, type RetreatDayContent } from '@/lib/mahanaim/admin-retreat-days-shared'

export const RETREAT_SLUG = 'chambre-haute-2026'

const DAY_COLUMNS = [
  'id',
  'retreat_id',
  'day_number',
  'day_date',
  ...RETREAT_DAY_CONTENT_FIELDS,
  'status',
].join(',')

const TEXT_LIMITS: Record<string, number> = {
  title: 240,
  scripture_reference: 240,
  scripture_text: 20000,
  meditation: 30000,
  objective: 5000,
  action: 5000,
}

type SaveResult =
  | { ok: true; day: RetreatDayContent }
  | { ok: false; reason: 'invalid' | 'not_found' | 'database'; message?: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 100 && value.every(
    (item) => typeof item === 'string' && item.length <= 3000,
  )
}

export async function getRetreatDays(): Promise<RetreatDayContent[]> {
  const db = supabaseAdmin.schema('chapelle')
  const { data: retreat, error: retreatError } = await db
    .from('mahanaim_retreats')
    .select('id')
    .eq('slug', RETREAT_SLUG)
    .maybeSingle()

  if (retreatError || !retreat?.id) throw new Error('mahanaim_retreat_not_available')

  const { data, error } = await db
    .from('mahanaim_retreat_days')
    .select(DAY_COLUMNS)
    .eq('retreat_id', retreat.id)
    .order('day_number', { ascending: true })

  if (error || !data) throw new Error('mahanaim_retreat_days_read_failed')
  return data as unknown as RetreatDayContent[]
}

function validateDraft(input: unknown): { id: string; patch: Record<string, unknown> } | SaveResult {
  if (!isRecord(input) || typeof input.id !== 'string' || !UUID_RE.test(input.id)) {
    return { ok: false, reason: 'invalid', message: 'Identifiant de journée invalide.' }
  }

  const allowed = new Set<string>(RETREAT_DAY_CONTENT_FIELDS)
  const submitted = Object.keys(input).filter((key) => key !== 'id')
  if (submitted.length === 0 || submitted.some((key) => !allowed.has(key))) {
    return { ok: false, reason: 'invalid', message: 'Aucun champ autorisé à enregistrer ou champ non autorisé.' }
  }

  const patch: Record<string, unknown> = {}
  for (const key of submitted) {
    const value = input[key]
    if (key === 'prayers' || key === 'declarations') {
      if (!isStringList(value)) {
        return { ok: false, reason: 'invalid', message: 'Les prières et déclarations doivent être des listes de textes.' }
      }
      patch[key] = value.map((item) => item.trim()).filter(Boolean)
      continue
    }

    if (value !== null && (typeof value !== 'string' || value.length > TEXT_LIMITS[key])) {
      return { ok: false, reason: 'invalid', message: `Le champ « ${key} » est invalide ou trop long.` }
    }
    if (key === 'title' && value === null) {
      return { ok: false, reason: 'invalid', message: 'Le titre ne peut pas être nul.' }
    }
    patch[key] = key === 'title'
      ? (typeof value === 'string' ? value.trim() : value)
      : (typeof value === 'string' && value.trim() === '' ? null : value)
  }

  return { id: input.id, patch }
}

export async function saveRetreatDayDraft(input: unknown): Promise<SaveResult> {
  const validated = validateDraft(input)
  if ('ok' in validated) return validated

  try {
    const db = supabaseAdmin.schema('chapelle')
    const { data: retreat, error: retreatError } = await db
      .from('mahanaim_retreats')
      .select('id')
      .eq('slug', RETREAT_SLUG)
      .maybeSingle()

    if (retreatError || !retreat?.id) return { ok: false, reason: 'database' }

    const { data, error } = await db
      .from('mahanaim_retreat_days')
      .update(validated.patch)
      .eq('id', validated.id)
      .eq('retreat_id', retreat.id)
      .select(DAY_COLUMNS)
      .maybeSingle()

    if (error) return { ok: false, reason: 'database' }
    if (!data) return { ok: false, reason: 'not_found' }
    return { ok: true, day: data as unknown as RetreatDayContent }
  } catch {
    return { ok: false, reason: 'database' }
  }
}

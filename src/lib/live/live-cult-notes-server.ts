import 'server-only'

import { getVerifiedRouteProfile } from '@/lib/member-auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  type LiveCultNote,
  type LiveCultNoteKind,
  type LiveCultNoteWrite,
  validCultNoteUuid,
} from './live-cult-notes'

const NOTE_COLUMNS = [
  'id',
  'cms_live_id',
  'kind',
  'body',
  'position_seconds',
  'scripture_reference',
  'created_at',
  'updated_at',
].join(',')

type FailureReason =
  | 'identity_required'
  | 'invalid_request'
  | 'not_found'
  | 'unavailable'

export type CultNotesServerResult =
  | { ok: true; notes: LiveCultNote[] }
  | { ok: false; reason: FailureReason }

export type CultNoteServerResult =
  | { ok: true; note: LiveCultNote }
  | { ok: false; reason: FailureReason }

export type DeleteCultNoteServerResult =
  | { ok: true }
  | { ok: false; reason: FailureReason }

export type MemberCultNoteUpdate = {
  id: string
  cmsLiveId: string
  kind?: LiveCultNoteKind
  body?: string
  scriptureReference?: string | null
}

type NoteRow = {
  id: string
  cms_live_id: string
  kind: LiveCultNoteKind
  body: string
  position_seconds: number | null
  scripture_reference: string | null
  created_at: string
  updated_at: string
}

function toNote(row: NoteRow): LiveCultNote {
  return {
    id: row.id,
    cmsLiveId: row.cms_live_id,
    kind: row.kind,
    body: row.body,
    positionSeconds: row.position_seconds ?? null,
    scriptureReference: row.scripture_reference ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function memberUserId(): Promise<string | null> {
  const profile = await getVerifiedRouteProfile()
  return profile?.uid ?? null
}

function validIds(...values: unknown[]): boolean {
  return values.every(validCultNoteUuid)
}

function failure(
  reason: FailureReason,
): { ok: false; reason: FailureReason } {
  return { ok: false, reason }
}

async function findOwnedById(
  id: string,
  userId: string,
): Promise<
  | { ok: true; row: NoteRow | null }
  | { ok: false }
> {
  const db = supabaseAdmin as any
  const { data, error } = await db
    .from('live_cult_notes')
    .select(NOTE_COLUMNS)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { ok: false }
  return {
    ok: true,
    row: (data as NoteRow | null) ?? null,
  }
}

export async function listMemberCultNotes(
  cmsLiveId: string,
): Promise<CultNotesServerResult> {
  try {
    if (!validIds(cmsLiveId)) return failure('invalid_request')

    const userId = await memberUserId()
    if (!userId) return failure('identity_required')

    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('live_cult_notes')
      .select(NOTE_COLUMNS)
      .eq('user_id', userId)
      .eq('cms_live_id', cmsLiveId)

    if (error) return failure('unavailable')

    return {
      ok: true,
      notes: (Array.isArray(data) ? data : []).map(
        row => toNote(row as NoteRow),
      ),
    }
  } catch {
    return failure('unavailable')
  }
}

export async function createMemberCultNote(
  input: LiveCultNoteWrite,
): Promise<CultNoteServerResult> {
  try {
    if (!validIds(input.id, input.cmsLiveId)) {
      return failure('invalid_request')
    }

    const userId = await memberUserId()
    if (!userId) return failure('identity_required')

    const lookup = await findOwnedById(input.id, userId)
    if (!lookup.ok) return failure('unavailable')

    if (lookup.row) {
      return lookup.row.cms_live_id === input.cmsLiveId
        ? { ok: true, note: toNote(lookup.row) }
        : failure('not_found')
    }

    const payload = {
      id: input.id,
      cms_live_id: input.cmsLiveId,
      user_id: userId,
      kind: input.kind,
      body: input.body,
      position_seconds: input.positionSeconds,
      scripture_reference: input.scriptureReference,
    }

    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('live_cult_notes')
      .insert(payload)
      .select(NOTE_COLUMNS)
      .single()

    if (error) {
      if ((error as { code?: string }).code !== '23505') {
        return failure('unavailable')
      }

      const retry = await findOwnedById(input.id, userId)
      if (!retry.ok) return failure('unavailable')
      if (!retry.row || retry.row.cms_live_id !== input.cmsLiveId) {
        return failure('not_found')
      }
      return { ok: true, note: toNote(retry.row) }
    }

    if (!data) return failure('unavailable')
    return { ok: true, note: toNote(data as NoteRow) }
  } catch {
    return failure('unavailable')
  }
}

export async function updateMemberCultNote(
  input: MemberCultNoteUpdate,
): Promise<CultNoteServerResult> {
  try {
    if (!validIds(input.id, input.cmsLiveId)) {
      return failure('invalid_request')
    }

    const userId = await memberUserId()
    if (!userId) return failure('identity_required')

    const payload: Record<string, unknown> = {}
    if (input.kind !== undefined) payload.kind = input.kind
    if (input.body !== undefined) payload.body = input.body
    if (input.scriptureReference !== undefined) {
      payload.scripture_reference = input.scriptureReference
    }
    if (Object.keys(payload).length === 0) {
      return failure('invalid_request')
    }

    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('live_cult_notes')
      .update(payload)
      .eq('id', input.id)
      .eq('cms_live_id', input.cmsLiveId)
      .eq('user_id', userId)
      .select(NOTE_COLUMNS)
      .maybeSingle()

    if (error) return failure('unavailable')
    if (!data) return failure('not_found')
    return { ok: true, note: toNote(data as NoteRow) }
  } catch {
    return failure('unavailable')
  }
}

export async function deleteMemberCultNote(
  cmsLiveId: string,
  id: string,
): Promise<DeleteCultNoteServerResult> {
  try {
    if (!validIds(cmsLiveId, id)) return failure('invalid_request')

    const userId = await memberUserId()
    if (!userId) return failure('identity_required')

    const db = supabaseAdmin as any
    const { data, error } = await db
      .from('live_cult_notes')
      .delete()
      .eq('id', id)
      .eq('cms_live_id', cmsLiveId)
      .eq('user_id', userId)
      .select('id')
      .maybeSingle()

    if (error) return failure('unavailable')
    if (!data) return failure('not_found')
    return { ok: true }
  } catch {
    return failure('unavailable')
  }
}

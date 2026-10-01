import 'server-only'

import {
  getVerifiedRouteProfile,
} from '@/lib/member-auth'

import {
  supabaseAdmin,
} from '@/lib/supabase'

import {
  createServerClient,
} from '@/lib/supabase-server'

const CHAMBRE_HAUTE_SLUG =
  'chambre-haute-2026'

const VISIBLE_STATUSES =
  new Set([
    'registration_open',
    'active',
    'completed',
  ])

const SLUG_RE =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type RetreatRow = {
  id: string
  event_id: string
  slug: string
  theme: string | null
  subtitle: string | null
  scripture_reference: string | null
  scripture_text: string | null
  digital_description: string | null
  hero_image_url: string | null
  start_date: string
  end_date: string
  closing_date: string | null
  daily_start_time: string
  timezone: string
  digital_status: string
  access_type: string
  is_featured: boolean
}

type DayRow = {
  id: string
  retreat_id: string
  day_number: number
  day_date: string
  title: string
  scripture_reference: string | null
  status: string
}

type EnrollmentRow = {
  id: string
  retreat_id: string
  member_id: string
  status: string
  last_opened_day: number | null
  enrolled_at: string
  completed_at: string | null
}

export type MemberRetreatSummary = {
  id: string
  slug: string
  theme: string
  subtitle: string | null
  scriptureReference: string | null
  scriptureText: string | null
  description: string | null
  heroImageUrl: string | null
  startDate: string
  endDate: string
  closingDate: string | null
  dailyStartTime: string
  timezone: string
  digitalStatus: string
  accessType: string
  featured: boolean
  enrolled: boolean
}

export type MemberRetreatDay = {
  id: string
  dayNumber: number
  dayDate: string
  title: string
  scriptureReference: string | null
  status: string
}

export type MemberRetreatDetail =
  MemberRetreatSummary & {
    days: MemberRetreatDay[]
  }

export type EnrollMemberResult =
  | {
      ok: true
      alreadyEnrolled: boolean
      enrollmentId: string
    }
  | {
      ok: false
      reason:
        | 'identity_required'
        | 'member_not_found'
        | 'not_found'
        | 'closed'
        | 'unavailable'
    }

function validSlug(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 120 &&
    SLUG_RE.test(value)
  )
}

function mapRetreat(
  row: RetreatRow,
  enrolled: boolean,
): MemberRetreatSummary {
  return {
    id: row.id,
    slug: row.slug,
    theme:
      row.theme?.trim() ||
      'Retraite Mahanaïm',
    subtitle:
      row.subtitle ?? null,
    scriptureReference:
      row.scripture_reference ?? null,
    scriptureText:
      row.scripture_text ?? null,
    description:
      row.digital_description ?? null,
    heroImageUrl:
      row.hero_image_url ?? null,
    startDate:
      row.start_date,
    endDate:
      row.end_date,
    closingDate:
      row.closing_date ?? null,
    dailyStartTime:
      row.daily_start_time,
    timezone:
      row.timezone,
    digitalStatus:
      row.digital_status,
    accessType:
      row.access_type,
    featured:
      row.is_featured === true,
    enrolled,
  }
}

async function verifiedMemberId():
  Promise<
    | {
        ok: true
        authUserId: string
        memberId: string
      }
    | {
        ok: false
        reason:
          | 'identity_required'
          | 'member_not_found'
          | 'unavailable'
      }
  > {
  const profile =
    await getVerifiedRouteProfile()

  if (!profile?.uid) {
    return {
      ok: false,
      reason: 'identity_required',
    }
  }

  try {
    const db =
      supabaseAdmin.schema('chapelle')

    const {
      data,
      error,
    } =
      await db
        .from('members')
        .select('id')
        .eq(
          'auth_user_id',
          profile.uid,
        )
        .maybeSingle()

    if (error) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    if (
      !data ||
      typeof data.id !== 'string'
    ) {
      return {
        ok: false,
        reason: 'member_not_found',
      }
    }

    return {
      ok: true,
      authUserId:
        profile.uid,
      memberId:
        data.id,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

async function adminRetreatBySlug(
  slug: string,
): Promise<RetreatRow | null> {
  const db =
    supabaseAdmin.schema('chapelle')

  const {
    data,
    error,
  } =
    await db
      .from('mahanaim_retreats')
      .select([
        'id',
        'event_id',
        'slug',
        'theme',
        'subtitle',
        'scripture_reference',
        'scripture_text',
        'digital_description',
        'hero_image_url',
        'start_date',
        'end_date',
        'closing_date',
        'daily_start_time',
        'timezone',
        'digital_status',
        'access_type',
        'is_featured',
      ].join(','))
      .eq(
        'slug',
        slug,
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      'mahanaim_retreat_read_failed',
    )
  }

  return (
    data as RetreatRow | null
  )
}

async function adminEnrollmentFor(
  retreatId: string,
  memberId: string,
): Promise<EnrollmentRow | null> {
  const db =
    supabaseAdmin.schema('chapelle')

  const {
    data,
    error,
  } =
    await db
      .from(
        'mahanaim_retreat_enrollments',
      )
      .select([
        'id',
        'retreat_id',
        'member_id',
        'status',
        'last_opened_day',
        'enrolled_at',
        'completed_at',
      ].join(','))
      .eq(
        'retreat_id',
        retreatId,
      )
      .eq(
        'member_id',
        memberId,
      )
      .maybeSingle()

  if (error) {
    throw new Error(
      'mahanaim_enrollment_read_failed',
    )
  }

  return (
    data as EnrollmentRow | null
  )
}

export async function listMemberRetreats():
  Promise<MemberRetreatSummary[]> {
  const identity =
    await verifiedMemberId()

  if (!identity.ok) {
    return []
  }

  try {
    const db =
      createServerClient().schema('chapelle')

    const {
      data,
      error,
    } =
      await db
        .from('mahanaim_retreats')
        .select([
          'id',
          'event_id',
          'slug',
          'theme',
          'subtitle',
          'scripture_reference',
          'scripture_text',
          'digital_description',
          'hero_image_url',
          'start_date',
          'end_date',
          'closing_date',
          'daily_start_time',
          'timezone',
          'digital_status',
          'access_type',
          'is_featured',
        ].join(','))
        .in(
          'digital_status',
          Array.from(
            VISIBLE_STATUSES,
          ),
        )
        .order(
          'start_date',
          {
            ascending: true,
          },
        )

    if (error) {
      return []
    }

    const retreats =
      (Array.isArray(data)
        ? data
        : []) as unknown as RetreatRow[]

    if (
      retreats.length === 0
    ) {
      return []
    }

    const {
      data: enrollmentRows,
      error: enrollmentError,
    } =
      await db
        .from(
          'mahanaim_retreat_enrollments',
        )
        .select(
          'retreat_id',
        )
        .eq(
          'member_id',
          identity.memberId,
        )

    if (enrollmentError) {
      return []
    }

    const enrolledIds =
      new Set(
        (
          Array.isArray(
            enrollmentRows,
          )
            ? enrollmentRows
            : []
        )
          .map(
            row =>
              typeof row.retreat_id ===
              'string'
                ? row.retreat_id
                : null,
          )
          .filter(
            (
              id,
            ): id is string =>
              Boolean(id),
          ),
      )

    return retreats.map(
      retreat =>
        mapRetreat(
          retreat,
          enrolledIds.has(
            retreat.id,
          ),
        ),
    )
  } catch {
    return []
  }
}

export async function getMemberRetreatBySlug(
  slug: string,
): Promise<MemberRetreatDetail | null> {
  if (!validSlug(slug)) {
    return null
  }

  const identity =
    await verifiedMemberId()

  if (!identity.ok) {
    return null
  }

  try {
    const db =
      createServerClient()
        .schema('chapelle')

    const {
      data: retreatData,
      error: retreatError,
    } =
      await db
        .from('mahanaim_retreats')
        .select([
          'id',
          'event_id',
          'slug',
          'theme',
          'subtitle',
          'scripture_reference',
          'scripture_text',
          'digital_description',
          'hero_image_url',
          'start_date',
          'end_date',
          'closing_date',
          'daily_start_time',
          'timezone',
          'digital_status',
          'access_type',
          'is_featured',
        ].join(','))
        .eq(
          'slug',
          slug,
        )
        .maybeSingle()

    if (
      retreatError ||
      !retreatData
    ) {
      return null
    }

    const retreat =
      retreatData as unknown as RetreatRow

    if (
      !VISIBLE_STATUSES.has(
        retreat.digital_status,
      )
    ) {
      return null
    }

    const {
      data: enrollmentData,
      error: enrollmentError,
    } =
      await db
        .from(
          'mahanaim_retreat_enrollments',
        )
        .select([
          'id',
          'retreat_id',
          'member_id',
          'status',
          'last_opened_day',
          'enrolled_at',
          'completed_at',
        ].join(','))
        .eq(
          'retreat_id',
          retreat.id,
        )
        .eq(
          'member_id',
          identity.memberId,
        )
        .maybeSingle()

    if (enrollmentError) {
      return null
    }

    const enrollment =
      enrollmentData as
        | EnrollmentRow
        | null

    const {
      data: days,
      error: daysError,
    } =
      await db
        .from(
          'mahanaim_retreat_days',
        )
        .select([
          'id',
          'retreat_id',
          'day_number',
          'day_date',
          'title',
          'scripture_reference',
          'status',
        ].join(','))
        .eq(
          'retreat_id',
          retreat.id,
        )
        .order(
          'day_number',
          {
            ascending: true,
          },
        )

    if (daysError) {
      return null
    }

    return {
      ...mapRetreat(
        retreat,
        Boolean(enrollment),
      ),

      days:
        (
          Array.isArray(days)
            ? days
            : []
        ).map(
          raw => {
            const row =
              raw as unknown as DayRow

            return {
              id:
                row.id,

              dayNumber:
                row.day_number,

              dayDate:
                row.day_date,

              title:
                row.title,

              scriptureReference:
                row.scripture_reference ??
                null,

              status:
                row.status,
            }
          },
        ),
    }
  } catch {
    return null
  }
}

export async function enrollMemberInRetreat(
  slug: string,
): Promise<EnrollMemberResult> {
  if (!validSlug(slug)) {
    return {
      ok: false,
      reason: 'not_found',
    }
  }

  const identity =
    await verifiedMemberId()

  if (!identity.ok) {
    return identity
  }

  try {
    const retreat =
      await adminRetreatBySlug(slug)

    if (!retreat) {
      return {
        ok: false,
        reason: 'not_found',
      }
    }

    if (
      retreat.digital_status !==
        'registration_open' &&
      retreat.digital_status !==
        'active'
    ) {
      return {
        ok: false,
        reason: 'closed',
      }
    }

    const existing =
      await adminEnrollmentFor(
        retreat.id,
        identity.memberId,
      )

    if (existing) {
      return {
        ok: true,
        alreadyEnrolled: true,
        enrollmentId:
          existing.id,
      }
    }

    const db =
      supabaseAdmin.schema('chapelle')

    const {
      data,
      error,
    } =
      await db
        .from(
          'mahanaim_retreat_enrollments',
        )
        .insert({
          retreat_id:
            retreat.id,
          member_id:
            identity.memberId,
          status:
            'registered',
        })
        .select('id')
        .single()

    if (error) {
      if (
        error.code === '23505'
      ) {
        const retry =
          await adminEnrollmentFor(
            retreat.id,
            identity.memberId,
          )

        if (retry) {
          return {
            ok: true,
            alreadyEnrolled: true,
            enrollmentId:
              retry.id,
          }
        }
      }

      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    if (
      !data ||
      typeof data.id !== 'string'
    ) {
      return {
        ok: false,
        reason: 'unavailable',
      }
    }

    return {
      ok: true,
      alreadyEnrolled: false,
      enrollmentId:
        data.id,
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
    }
  }
}

export {
  CHAMBRE_HAUTE_SLUG,
}
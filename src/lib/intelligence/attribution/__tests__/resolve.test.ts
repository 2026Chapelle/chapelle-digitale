import { describe, it, expect } from 'vitest'
import {
  buildSessionIndex,
  resolveConversionRow,
  resolveConversionSource,
  resolveConversions,
  type SessionSourceRow,
} from '../resolve'

const SESSIONS: SessionSourceRow[] = [
  { session_key: 'k-wa', user_id: 'u1', source: 'whatsapp', referrer: '', first_seen: '2026-08-19T08:00:00.000Z' },
  { session_key: 'k-late', user_id: 'u1', source: 'facebook', referrer: '', first_seen: '2026-08-19T20:00:00.000Z' },
  { session_key: 'k-anon', user_id: null, source: 'referral', referrer: 'https://www.chapelleduroyaume.org', first_seen: '2026-08-19T09:00:00.000Z' },
]

describe('résolution first-touch', () => {
  const index = buildSessionIndex(SESSIONS)

  it('SESSION_KEY prioritaire (jointure 1:1)', () => {
    expect(resolveConversionSource({ sessionKey: 'k-anon' }, index)).toBe('chapelle')
  })

  it('FIRST_TOUCH_PRESERVED : par utilisateur, on prend la session la PLUS ANCIENNE', () => {
    // u1 a whatsapp@08h et facebook@20h → first-touch = whatsapp
    expect(resolveConversionSource({ userId: 'u1' }, index)).toBe('whatsapp')
  })

  it('INTERNAL_NAV_DOES_NOT_OVERWRITE_SOURCE : une session interne plus récente ne change pas le first-touch', () => {
    const withInternal = buildSessionIndex([
      ...SESSIONS,
      { session_key: 'k-int', user_id: 'u1', source: 'referral', referrer: 'https://citadelle.chapelleduroyaume.org/x', first_seen: '2026-08-19T22:00:00.000Z' },
    ])
    // la plus ancienne reste whatsapp@08h ; la session interne (22h) n'écrase rien
    expect(resolveConversionSource({ userId: 'u1' }, withInternal)).toBe('whatsapp')
  })

  it('non attribuable → null (jamais deviné)', () => {
    expect(resolveConversionSource({ userId: 'inconnu' }, index)).toBeNull()
    expect(resolveConversionSource({ sessionKey: 'absent' }, index)).toBeNull()
    expect(resolveConversionSource({}, index)).toBeNull()
  })

  it('resolveConversions aligne la liste (source|null)', () => {
    const out = resolveConversions(
      [{ sessionKey: 'k-anon' }, { userId: 'u1' }, { userId: 'x' }],
      index,
    )
    expect(out).toEqual(['chapelle', 'whatsapp', null])
  })

  it('resolveConversionRow renvoie la SESSION first-touch complète (HUB-3)', () => {
    // u1 first-touch = k-wa (08h) ; on récupère la ligne, pas juste la source
    expect(resolveConversionRow({ userId: 'u1' }, index)?.session_key).toBe('k-wa')
    expect(resolveConversionRow({ sessionKey: 'k-anon' }, index)?.source).toBe('referral')
    expect(resolveConversionRow({ userId: 'inconnu' }, index)).toBeNull()
  })

  it('FIRST_TOUCH_CAMPAIGN_PRESERVED / INTERNAL_NAV_DOES_NOT_OVERWRITE_CAMPAIGN', () => {
    const idx = buildSessionIndex([
      { session_key: 'a', user_id: 'u9', source: 'whatsapp', referrer: '', first_seen: '2026-08-20T08:00:00.000Z', utm_campaign: 'culte_20260823', utm_content: 'main' },
      { session_key: 'b', user_id: 'u9', source: 'facebook', referrer: '', first_seen: '2026-08-20T15:00:00.000Z', utm_campaign: 'autre_campagne', utm_content: 'x' },
      { session_key: 'c', user_id: 'u9', source: 'referral', referrer: 'https://citadelle.chapelleduroyaume.org/x', first_seen: '2026-08-20T22:00:00.000Z', utm_campaign: null, utm_content: null },
    ])
    // La conversion pour u9 doit porter la campagne de la PREMIÈRE session (08h),
    // pas celle de 15h ni la nav interne de 22h.
    const row = resolveConversionRow({ userId: 'u9' }, idx)
    expect(row?.utm_campaign).toBe('culte_20260823')
    expect(row?.utm_content).toBe('main')
    expect(row?.source).toBe('whatsapp')
  })
})

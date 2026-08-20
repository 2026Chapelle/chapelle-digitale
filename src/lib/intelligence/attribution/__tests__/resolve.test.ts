import { describe, it, expect } from 'vitest'
import {
  buildSessionIndex,
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
})

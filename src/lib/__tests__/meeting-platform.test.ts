import { describe, it, expect } from 'vitest'
import { detectMeetingPlatform, meetingPlatformLabel, isValidMeetingUrl, platformUrlHint, MEETING_PLATFORMS } from '@/lib/community/meeting-platform'
import { validateReunionInput } from '@/lib/community/attendance'

describe('detectMeetingPlatform', () => {
  it('reconnaît les plateformes via l\'URL', () => {
    expect(detectMeetingPlatform('https://us02web.zoom.us/j/123').key).toBe('zoom')
    expect(detectMeetingPlatform('https://meet.google.com/abc-defg-hij').key).toBe('google-meet')
    expect(detectMeetingPlatform('https://meet.jit.si/CitadelleCellule').key).toBe('jitsi')
    expect(detectMeetingPlatform('https://teams.microsoft.com/l/meetup-join/xyz').key).toBe('teams')
    expect(detectMeetingPlatform('https://example.com/visio').key).toBe('autre')
  })
  it('vide / null → Autre', () => {
    expect(detectMeetingPlatform('').key).toBe('autre')
    expect(detectMeetingPlatform(null).key).toBe('autre')
  })
  it('meetingPlatformLabel', () => {
    expect(meetingPlatformLabel('https://zoom.us/j/1')).toBe('Zoom')
    expect(meetingPlatformLabel(null)).toBe('Autre')
  })
})

describe('isValidMeetingUrl', () => {
  it('accepte http(s) et le vide', () => {
    expect(isValidMeetingUrl('https://meet.google.com/abc')).toBe(true)
    expect(isValidMeetingUrl('http://zoom.us/j/1')).toBe(true)
    expect(isValidMeetingUrl('')).toBe(true)
    expect(isValidMeetingUrl(null)).toBe(true)
  })
  it('rejette les schémas non http(s) et les chaînes invalides', () => {
    expect(isValidMeetingUrl('javascript:alert(1)')).toBe(false)
    expect(isValidMeetingUrl('zoom.us/j/1')).toBe(false) // pas de schéma
    expect(isValidMeetingUrl('pas une url')).toBe(false)
  })
})

describe('platformUrlHint + référentiel', () => {
  it('exemples par plateforme', () => {
    expect(platformUrlHint('zoom')).toContain('zoom.us')
    expect(platformUrlHint('google-meet')).toContain('meet.google.com')
    expect(platformUrlHint('autre')).toBe('https://...')
  })
  it('5 plateformes officielles', () => {
    expect(MEETING_PLATFORMS.map((p) => p.label)).toEqual(['Zoom', 'Google Meet', 'Jitsi', 'Microsoft Teams', 'Autre'])
  })
})

describe('validateReunionInput — lien visio (V1)', () => {
  const base = { groupe_id: 'g', titre: 'T', date_reunion: '2026-06-10T18:00:00Z', type: 'virtuelle' }
  it('accepte un lien http(s) valide', () => {
    expect(validateReunionInput({ ...base, lien_visio: 'https://meet.jit.si/Cellule' }).ok).toBe(true)
  })
  it('refuse un lien non http(s)', () => {
    expect(validateReunionInput({ ...base, lien_visio: 'javascript:alert(1)' }).ok).toBe(false)
  })
  it('lien vide toléré', () => {
    expect(validateReunionInput({ ...base, lien_visio: '' }).ok).toBe(true)
  })
})

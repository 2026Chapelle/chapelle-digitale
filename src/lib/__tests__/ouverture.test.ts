import { describe, it, expect } from 'vitest'
import {
  OPENING_DATE_LABEL,
  OPENING_DATE_SENTENCE,
  OPENING_DAY_SHORT,
  OPENING_ISO,
  OPENING_MS,
  OUVERTURE_ROUTES,
  countdownTo,
  finalCtaLabel,
  heroCtaLabel,
  isOpen,
  primaryCtaHref,
  resolveOpeningVideo,
  youtubeThumbnail,
} from '@/lib/ouverture'

const SECOND = 1_000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('instant d’ouverture', () => {
  it('cible le 09 août 2026 à 00H00 heure d’Abidjan (= UTC, aucun DST)', () => {
    const d = new Date(OPENING_MS)
    expect(d.toISOString()).toBe(OPENING_ISO)
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(7) // août
    expect(d.getUTCDate()).toBe(9)
    expect(d.getUTCHours()).toBe(0)
    expect(d.getUTCMinutes()).toBe(0)
    expect(d.getUTCSeconds()).toBe(0)
    expect(d.getUTCDay()).toBe(0) // dimanche — cohérent avec le libellé affiché
  })

  it('n’est plus le 02 août : la date reportée est bien prise en compte', () => {
    expect(OPENING_ISO).toBe('2026-08-09T00:00:00.000Z')
    expect(OPENING_ISO).not.toContain('2026-08-02')
    expect(new Date(OPENING_MS).getUTCDate()).not.toBe(2)
  })

  it('expose des libellés cohérents avec l’instant d’ouverture', () => {
    expect(OPENING_DATE_LABEL).toBe('DIMANCHE 09 AOÛT 2026 — 00H00')
    expect(OPENING_DATE_SENTENCE).toBe('dimanche 09 août 2026 à 00H00')
    expect(OPENING_DAY_SHORT).toBe('09 août')
    // Aucun libellé ne doit conserver l'ancienne date de campagne.
    for (const label of [OPENING_DATE_LABEL, OPENING_DATE_SENTENCE, OPENING_DAY_SHORT]) {
      expect(label).not.toMatch(/\b0?2\s+ao[uû]t/i)
    }
  })
})

describe('isOpen', () => {
  it('est faux avant l’échéance', () => {
    expect(isOpen(OPENING_MS - SECOND)).toBe(false)
  })

  it('est vrai à la seconde exacte de l’ouverture', () => {
    expect(isOpen(OPENING_MS)).toBe(true)
  })

  it('est vrai après l’échéance', () => {
    expect(isOpen(OPENING_MS + DAY)).toBe(true)
  })
})

describe('countdownTo', () => {
  it('décompose correctement le temps restant', () => {
    const now = OPENING_MS - (3 * DAY + 4 * HOUR + 5 * MINUTE + 6 * SECOND)
    expect(countdownTo(now)).toEqual({ days: 3, hours: 4, minutes: 5, seconds: 6, done: false })
  })

  it('gère la dernière seconde avant l’ouverture', () => {
    expect(countdownTo(OPENING_MS - SECOND)).toEqual({
      days: 0, hours: 0, minutes: 0, seconds: 1, done: false,
    })
  })

  it('n’affiche jamais de valeur négative après l’échéance', () => {
    const after = countdownTo(OPENING_MS + 10 * DAY)
    expect(after).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, done: true })
    for (const v of [after.days, after.hours, after.minutes, after.seconds]) {
      expect(v).toBeGreaterThanOrEqual(0)
    }
  })

  it('bascule sur done à la seconde exacte', () => {
    expect(countdownTo(OPENING_MS).done).toBe(true)
    expect(countdownTo(OPENING_MS - 1).done).toBe(false)
  })
})

describe('libellés de CTA', () => {
  it('bascule le CTA du hero selon l’état d’ouverture', () => {
    expect(heroCtaLabel(false)).toBe('ME PRÉPARER À ENTRER')
    expect(heroCtaLabel(true)).toBe('ENTRER DANS LA CITADELLE')
  })

  it('bascule le CTA final selon l’état d’ouverture', () => {
    expect(finalCtaLabel(false)).toBe('ME PRÉPARER POUR L’OUVERTURE')
    expect(finalCtaLabel(true)).toBe('ENTRER MAINTENANT')
  })

  it('pointe vers la route d’inscription réelle du projet', () => {
    expect(OUVERTURE_ROUTES.inscription).toBe('/register')
    expect(OUVERTURE_ROUTES.connexion).toBe('/login')
    expect(primaryCtaHref()).toBe('/register?next=%2Fmember%2Fdashboard')
  })

  it('expose les deux routes de la campagne', () => {
    expect(OUVERTURE_ROUTES.entree).toBe('/ouverture')
    expect(OUVERTURE_ROUTES.vision).toBe('/ouverture/vision')
  })
})

describe('resolveOpeningVideo', () => {
  it('renvoie null quand rien n’est configuré', () => {
    expect(resolveOpeningVideo(undefined)).toBeNull()
    expect(resolveOpeningVideo(null)).toBeNull()
    expect(resolveOpeningVideo('   ')).toBeNull()
  })

  it('renvoie null pour une valeur inexploitable', () => {
    expect(resolveOpeningVideo('https://example.com/page')).toBeNull()
    expect(resolveOpeningVideo('à-définir')).toBeNull()
  })

  it('accepte un identifiant YouTube nu', () => {
    const v = resolveOpeningVideo('dQw4w9WgXcQ')
    expect(v).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' })
  })

  it('accepte les formats de liens YouTube courants', () => {
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/live/dQw4w9WgXcQ',
    ]
    for (const url of urls) {
      expect(resolveOpeningVideo(url)).toMatchObject({ kind: 'youtube', id: 'dQw4w9WgXcQ' })
    }
  })

  it('construit un embed nocookie conforme à la CSP du projet', () => {
    const v = resolveOpeningVideo('dQw4w9WgXcQ')
    expect(v?.kind).toBe('youtube')
    if (v?.kind === 'youtube') {
      expect(v.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(true)
      expect(v.embedUrl).toContain('playsinline=1')
    }
  })

  it('accepte un fichier vidéo direct', () => {
    expect(resolveOpeningVideo('https://cdn.example.com/ouverture.mp4')).toEqual({
      kind: 'file',
      src: 'https://cdn.example.com/ouverture.mp4',
    })
    expect(resolveOpeningVideo('/videos/ouverture.webm')).toEqual({
      kind: 'file',
      src: '/videos/ouverture.webm',
    })
  })

  it('produit une miniature sur un hôte autorisé par next.config.js', () => {
    expect(youtubeThumbnail('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
  })
})

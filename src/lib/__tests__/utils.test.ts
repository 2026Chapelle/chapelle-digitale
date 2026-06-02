import { describe, it, expect } from 'vitest'
import {
  formatNumber, truncate, slugify, getInitials,
  calculateEngagementScore, getScoreColor, getYouTubeId, formatCurrency,
} from '@/lib/utils'

describe('formatNumber', () => {
  it('laisse les petits nombres tels quels', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber(999)).toBe('999')
  })
  it('abrège les milliers en K', () => {
    expect(formatNumber(1500)).toBe('1.5K')
    expect(formatNumber(12000)).toBe('12.0K')
  })
  it('abrège les millions en M', () => {
    expect(formatNumber(2_000_000)).toBe('2.0M')
    expect(formatNumber(3_400_000)).toBe('3.4M')
  })
})

describe('truncate', () => {
  it('laisse intact un texte court', () => {
    expect(truncate('Bonjour', 100)).toBe('Bonjour')
  })
  it('coupe et ajoute une ellipse au-delà de la limite', () => {
    const out = truncate('a'.repeat(150), 100)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBe(101) // 100 chars + ellipse
  })
})

describe('slugify', () => {
  it('normalise accents, casse et séparateurs', () => {
    expect(slugify('Crème Brûlée')).toBe('creme-brulee')
    expect(slugify('  Bonjour le Monde !  ')).toBe('bonjour-le-monde')
    expect(slugify('Église du Royaume')).toBe('eglise-du-royaume')
  })
})

describe('getInitials', () => {
  it('prend les initiales (max 2)', () => {
    expect(getInitials('Jean Dupont')).toBe('JD')
    expect(getInitials('Marie')).toBe('M')
    expect(getInitials('Jean Pierre Martin')).toBe('JP')
  })
})

describe('calculateEngagementScore', () => {
  const base = {
    logins_last30days: 0, formations_completed: 0, events_attended: 0,
    prayers_submitted: 0, donations_count: 0, live_watched: 0,
  }
  it('vaut 0 sans activité', () => {
    expect(calculateEngagementScore(base)).toBe(0)
  })
  it('plafonne chaque composante et le total à 100', () => {
    expect(calculateEngagementScore({
      logins_last30days: 100, formations_completed: 100, events_attended: 100,
      prayers_submitted: 100, donations_count: 100, live_watched: 100,
    })).toBe(100)
  })
  it('additionne les composantes plafonnées', () => {
    // logins 3×2=6 + formations 1×10=10 = 16
    expect(calculateEngagementScore({ ...base, logins_last30days: 3, formations_completed: 1 })).toBe(16)
  })
})

describe('getScoreColor', () => {
  it('mappe le score sur une couleur par palier', () => {
    expect(getScoreColor(90)).toBe('#D4AF37')
    expect(getScoreColor(70)).toBe('#10B981')
    expect(getScoreColor(50)).toBe('#F59E0B')
    expect(getScoreColor(30)).toBe('#818CF8')
    expect(getScoreColor(10)).toBe('#6B7280')
  })
})

describe('getYouTubeId', () => {
  it('extrait l’ID de divers formats d’URL', () => {
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(getYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(getYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('renvoie null pour une URL non YouTube', () => {
    expect(getYouTubeId('https://vimeo.com/12345')).toBeNull()
  })
})

describe('formatCurrency', () => {
  it('formate un montant entier sans décimales', () => {
    const out = formatCurrency(1500, 'EUR')
    expect(typeof out).toBe('string')
    expect(out).toMatch(/1\D?500/) // espace fine/insécable selon ICU
    expect(out).not.toContain(',00')
  })
})

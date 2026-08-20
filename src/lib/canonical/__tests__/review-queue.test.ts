import { describe, it, expect } from 'vitest'
import { buildReviewQueue, countPendingAxes, type ReviewQueueRow } from '@/lib/canonical/review-queue'

const row = (over: Partial<ReviewQueueRow>): ReviewQueueRow => ({
  profile_id: 'p1', growth_level: null, growth_review_state: 'confirmed',
  community_status: null, community_review_state: 'confirmed', updated_at: null, ...over,
})

describe('review-queue — mise en forme de la file de revue', () => {
  it('un membre avec growth à valider → 1 item, 1 axe', () => {
    const q = buildReviewQueue([row({ growth_level: 'disciple', growth_review_state: 'requires_review', updated_at: '2026-08-01' })])
    expect(q).toHaveLength(1)
    expect(q[0].pending).toHaveLength(1)
    expect(q[0].pending[0].axis).toBe('growth_level')
    expect(q[0].pending[0].currentLabel).toBe('Disciple')
  })

  it('les deux axes à valider → 2 axes en attente', () => {
    const q = buildReviewQueue([row({
      growth_level: 'leader', growth_review_state: 'requires_review',
      community_status: 'member', community_review_state: 'requires_review', updated_at: '2026-08-01',
    })])
    expect(q[0].pending.map((p) => p.axis)).toEqual(['growth_level', 'community_status'])
  })

  it('un membre sans axe en attente est exclu', () => {
    const q = buildReviewQueue([row({ growth_review_state: 'confirmed', community_review_state: 'confirmed' })])
    expect(q).toHaveLength(0)
  })

  it('respecte les drapeaux *_needs_review de la vue quand fournis', () => {
    const q = buildReviewQueue([row({ growth_needs_review: true, community_needs_review: false, growth_review_state: 'confirmed' })])
    expect(q).toHaveLength(1)
    expect(q[0].pending.map((p) => p.axis)).toEqual(['growth_level'])
  })

  it('identité jointe : nom complet, sinon email, sinon fallback id', () => {
    const q = buildReviewQueue(
      [row({ profile_id: 'aaaaaaaa-1111', growth_review_state: 'requires_review', updated_at: '2026-08-01' })],
      { 'aaaaaaaa-1111': { prenom: 'Jean', nom: 'Dupont', email: 'j@d.fr' } },
    )
    expect(q[0].displayName).toBe('Jean Dupont')
    expect(q[0].email).toBe('j@d.fr')

    const q2 = buildReviewQueue([row({ profile_id: 'bbbbbbbb-2222', growth_review_state: 'requires_review' })], { 'bbbbbbbb-2222': { email: 'x@y.fr' } })
    expect(q2[0].displayName).toBe('x@y.fr')

    const q3 = buildReviewQueue([row({ profile_id: 'cccccccc-3333', growth_review_state: 'requires_review' })])
    expect(q3[0].displayName).toContain('cccccccc')
  })

  it('tri : plus anciens en tête, updated_at null en dernier', () => {
    const q = buildReviewQueue([
      row({ profile_id: 'recent', growth_review_state: 'requires_review', updated_at: '2026-08-10' }),
      row({ profile_id: 'null', growth_review_state: 'requires_review', updated_at: null }),
      row({ profile_id: 'old', growth_review_state: 'requires_review', updated_at: '2026-08-01' }),
    ])
    expect(q.map((i) => i.profileId)).toEqual(['old', 'recent', 'null'])
  })

  it('countPendingAxes additionne les axes à valider', () => {
    expect(countPendingAxes([
      row({ growth_review_state: 'requires_review', community_review_state: 'requires_review' }),
      row({ growth_review_state: 'requires_review' }),
      row({}),
    ])).toBe(3)
  })
})

import { describe, it, expect } from 'vitest'
import { authorizeHomeInstantPlayback } from '@/lib/podcast/home-instant'
import type { HomeSlotEpisode } from '@/lib/podcast/home-slots'

type Lvl = 'public' | 'member' | 'premium'
const ep = (id: string, accessLevel: Lvl, destinations: string[] = []): HomeSlotEpisode => ({
  id,
  accessLevel,
  destinations,
  hasAudio: true,
})

describe('authorizeHomeInstantPlayback — avant-goût gratuit accueil (sécurisé)', () => {
  it('visiteur + épisode member DÉSIGNÉ via destination home_instant → ALLOW', () => {
    const list = [ep('1', 'member', ['home_instant']), ep('2', 'member')]
    const r = authorizeHomeInstantPlayback(list, null, '1')
    expect(r).toEqual({ allowed: true, reason: 'ok', episodeId: '1' })
  })

  it('visiteur + épisode member DÉSIGNÉ via instant_ids → ALLOW', () => {
    const list = [ep('1', 'member'), ep('2', 'member')]
    const r = authorizeHomeInstantPlayback(list, { instantIds: ['2'], premiumIds: [] }, '2')
    expect(r.allowed).toBe(true)
    expect(r.episodeId).toBe('2')
  })

  it('épisode public → ALLOW (gratuit par nature)', () => {
    const list = [ep('1', 'public'), ep('2', 'member')]
    expect(authorizeHomeInstantPlayback(list, null, '1').allowed).toBe(true)
  })

  it('visiteur + AUTRE épisode member (pas l’instant désigné) → DENY not_designated', () => {
    const list = [ep('1', 'member', ['home_instant']), ep('2', 'member')]
    const r = authorizeHomeInstantPlayback(list, null, '2') // demande l'ID 2, mais l'instant est 1
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('not_designated')
    expect(r.episodeId).toBeNull()
  })

  it('instant member par simple REPLI (aucune désignation explicite) → DENY not_designated', () => {
    // Aucun instant_ids, aucune destination, aucun public → l'instant est un repli.
    const list = [ep('1', 'member'), ep('2', 'member')]
    const r = authorizeHomeInstantPlayback(list, null, '1')
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('not_designated')
  })

  it('épisode Premium même sélectionné par erreur (instant_ids) → DENY premium', () => {
    const list = [ep('1', 'premium'), ep('2', 'member')]
    const r = authorizeHomeInstantPlayback(list, { instantIds: ['1'], premiumIds: [] }, '1')
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('premium')
  })

  it('catalogue 100% premium → instant premium → DENY premium (jamais gratuit)', () => {
    const list = [ep('1', 'premium'), ep('2', 'premium')]
    const r = authorizeHomeInstantPlayback(list, null, '1')
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('premium')
  })

  it('changement de sélection home_instant → l’ancien épisode n’est plus autorisé', () => {
    const list = [ep('A', 'member'), ep('B', 'member')]
    // Sélection initiale : A
    expect(authorizeHomeInstantPlayback(list, { instantIds: ['A'], premiumIds: [] }, 'A').allowed).toBe(true)
    // La sélection passe à B → A n'est plus l'instant désigné → DENY ; B autorisé.
    expect(authorizeHomeInstantPlayback(list, { instantIds: ['B'], premiumIds: [] }, 'A').allowed).toBe(false)
    expect(authorizeHomeInstantPlayback(list, { instantIds: ['B'], premiumIds: [] }, 'A').reason).toBe('not_designated')
    expect(authorizeHomeInstantPlayback(list, { instantIds: ['B'], premiumIds: [] }, 'B').allowed).toBe(true)
  })

  it('liste vide → DENY no_instant', () => {
    expect(authorizeHomeInstantPlayback([], null, '1')).toEqual({ allowed: false, reason: 'no_instant', episodeId: null })
  })

  it('id vide / absent → DENY not_designated (jamais d’autorisation par défaut)', () => {
    const list = [ep('1', 'member', ['home_instant'])]
    expect(authorizeHomeInstantPlayback(list, null, '').allowed).toBe(false)
    expect(authorizeHomeInstantPlayback(list, null, 'zzz').allowed).toBe(false)
  })

  it('config prioritaire : instant_ids désigne l’instant même si un autre porte home_instant', () => {
    const list = [ep('1', 'member', ['home_instant']), ep('2', 'member')]
    // instant_ids=['2'] prime → l'instant est 2 ; 2 est explicitement désigné (instant_ids) → ALLOW
    expect(authorizeHomeInstantPlayback(list, { instantIds: ['2'], premiumIds: [] }, '2').allowed).toBe(true)
    // et 1 (qui a pourtant home_instant) n'est plus l'instant courant → DENY
    expect(authorizeHomeInstantPlayback(list, { instantIds: ['2'], premiumIds: [] }, '1').allowed).toBe(false)
  })
})

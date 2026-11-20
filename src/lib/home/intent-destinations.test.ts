import { describe, expect, it } from 'vitest'
import { INTENTS, resolveFirstStep, resolveIntentHref, type LiveState } from './contextual'
import type { MemberNextAction } from '@/lib/member-home/next-action'

const member: MemberNextAction = {
  kind: 'formation', label: 'Continuer ma formation', ctaLabel: 'Continuer', reason: 'Déjà commencée',
  href: '/member/dashboard/formations/fondements', priority: 20,
}
const live: LiveState = { status: 'LIVE', title: 'Culte en direct', watchUrl: 'https://youtu.be/abcdefghijk' }
const offline: LiveState = { status: 'OFFLINE' }

describe('cartes « De quoi as-tu besoin aujourd’hui ? » — destinations', () => {
  it('visiteur : chaque carte mène à sa destination validée', () => {
    expect(resolveIntentHref('closer_to_god', { authenticated: false })).toBe('/podcast')
    expect(resolveIntentHref('grow_in_faith', { authenticated: false })).toBe('/formations')
    expect(resolveIntentHref('need_prayer', { authenticated: false })).toBe('/priere')
    expect(resolveIntentHref('resume_walk', { authenticated: false })).toBe('/parcours')
  })

  it('« Grandir dans ma foi » mène au direct seulement quand un direct est en cours', () => {
    expect(resolveIntentHref('grow_in_faith', { authenticated: false, liveState: live })).toBe('/live')
    expect(resolveIntentHref('grow_in_faith', { authenticated: false, liveState: offline })).toBe('/formations')
    expect(resolveIntentHref('closer_to_god', { authenticated: false, liveState: live })).toBe('/podcast')
  })

  it('membre connecté : personnalisation conservée, sauf la prière toujours vers /priere', () => {
    for (const intent of ['closer_to_god', 'grow_in_faith', 'resume_walk'] as const) {
      expect(resolveIntentHref(intent, { authenticated: true, memberNextAction: member })).toBe(member.href)
    }
    expect(resolveIntentHref('need_prayer', { authenticated: true, memberNextAction: member })).toBe('/priere')
  })

  it('membre sans prochaine action : destinations visiteur', () => {
    expect(resolveIntentHref('closer_to_god', { authenticated: true, memberNextAction: null })).toBe('/podcast')
    expect(resolveIntentHref('resume_walk', { authenticated: true })).toBe('/parcours')
  })

  it('une seule source de vérité : la carte et l’encadré « premier pas » proposent la même destination', () => {
    for (const { id } of INTENTS) {
      for (const ctx of [{ authenticated: false }, { authenticated: true, memberNextAction: member }, { authenticated: false, liveState: live }]) {
        expect(resolveIntentHref(id, ctx)).toBe(resolveFirstStep({ intent: id, ...ctx }).href)
      }
    }
  })

  it('n’utilise que des routes internes existantes (aucune route inventée)', () => {
    const allowed = new Set(['/podcast', '/formations', '/live', '/priere', '/parcours'])
    for (const { id } of INTENTS) for (const liveState of [live, offline]) {
      const href = resolveIntentHref(id, { authenticated: false, liveState })
      expect(allowed.has(href)).toBe(true)
    }
  })

  it('« Me rapprocher de Dieu » présente un premier pas cohérent avec le podcast', () => {
    const step = resolveFirstStep({ intent: 'closer_to_god', authenticated: false })
    expect(step).toMatchObject({ type: 'podcast', href: '/podcast' })
    expect(step.cta.length).toBeGreaterThan(0)
  })
})

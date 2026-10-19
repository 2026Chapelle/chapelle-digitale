import { describe, expect, it } from 'vitest'
import {
  canReadGroupPost,
  canModerateGroupPost,
  validateGroupPost,
} from './group-space'

const member = {
  uid: 'member-1',
  activeMember: true,
  manager: false,
  activeGroup: true,
}
const post = {
  author_id: 'author-1',
  kind: 'priere' as const,
  state: 'publie' as const,
  visibility: 'groupe' as const,
}

describe('group space access', () => {
  it('allows an active member to read a published group post', () => {
    expect(canReadGroupPost(member, post)).toBe(true)
  })

  it('denies an outsider even for a published post', () => {
    expect(canReadGroupPost({ ...member, activeMember: false }, post)).toBe(false)
  })

  it('denies a former member access to their own post', () => {
    expect(canReadGroupPost(
      { ...member, uid: post.author_id, activeMember: false }, post,
    )).toBe(false)
  })

  it('denies all reads when the group is inactive', () => {
    expect(canReadGroupPost(
      { ...member, manager: true, activeGroup: false }, post,
    )).toBe(false)
  })

  it('hides a confidential prayer from another member', () => {
    expect(canReadGroupPost(
      member, { ...post, visibility: 'responsables' },
    )).toBe(false)
  })

  it('allows the active author to read their confidential prayer', () => {
    expect(canReadGroupPost(
      { ...member, uid: post.author_id },
      { ...post, visibility: 'responsables', state: 'en_attente' },
    )).toBe(true)
  })

  it('allows an authorized manager to read confidential prayers', () => {
    expect(canReadGroupPost(
      { ...member, activeMember: false, manager: true },
      { ...post, visibility: 'responsables' },
    )).toBe(true)
  })

  it('hides another member proposal before approval', () => {
    expect(canReadGroupPost(member, { ...post, state: 'en_attente' })).toBe(false)
  })

  it('allows the active author to see a refused proposal', () => {
    expect(canReadGroupPost(
      { ...member, uid: post.author_id }, { ...post, state: 'refuse' },
    )).toBe(true)
  })

  it('denies moderation to ordinary members including the author', () => {
    expect(canModerateGroupPost(
      { ...member, uid: post.author_id }, post,
    )).toBe(false)
  })

  it('allows moderation to an authorized manager of an active group', () => {
    expect(canModerateGroupPost({ ...member, manager: true }, post)).toBe(true)
  })

  it('denies moderation when the group is inactive', () => {
    expect(canModerateGroupPost(
      { ...member, manager: true, activeGroup: false }, post,
    )).toBe(false)
  })
})

describe('group post validation', () => {
  const valid = {
    kind: 'priere',
    title: 'Notre assemblee',
    body: 'Prions pour les familles.',
    visibility: 'groupe',
  }

  it('accepts a prayer and trims text', () => {
    const result = validateGroupPost({ ...valid, title: '  Notre assemblee  ' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBe('Notre assemblee')
  })

  it.each([null, [], 'texte', 42])('rejects malformed input %s', (input) => {
    expect(validateGroupPost(input).ok).toBe(false)
  })

  it('rejects unknown kinds and visibility values', () => {
    expect(validateGroupPost({ ...valid, kind: 'admin' }).ok).toBe(false)
    expect(validateGroupPost({ ...valid, visibility: 'public' }).ok).toBe(false)
  })

  it('rejects empty or excessive text', () => {
    expect(validateGroupPost({ ...valid, title: ' ' }).ok).toBe(false)
    expect(validateGroupPost({ ...valid, body: ' ' }).ok).toBe(false)
    expect(validateGroupPost({ ...valid, title: 'a'.repeat(161) }).ok).toBe(false)
    expect(validateGroupPost({ ...valid, body: 'a'.repeat(10001) }).ok).toBe(false)
  })

  it('requires explicit consent for a testimony', () => {
    expect(validateGroupPost({ ...valid, kind: 'temoignage' }).ok).toBe(false)
    expect(validateGroupPost({
      ...valid, kind: 'temoignage', consent: 'true',
    }).ok).toBe(false)
    expect(validateGroupPost({
      ...valid, kind: 'temoignage', consent: true,
    }).ok).toBe(true)
  })

  it('reserves confidential visibility for prayer requests', () => {
    expect(validateGroupPost({
      ...valid, kind: 'annonce', visibility: 'responsables',
    }).ok).toBe(false)
  })

  it('accepts an HTTPS resource link', () => {
    expect(validateGroupPost({
      ...valid, kind: 'ressource', resource_url: 'https://example.org/support.pdf',
    }).ok).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,test',
    'http://example.org/file',
    'https://user:password@example.org/file',
    'not-a-url',
  ])('rejects unsafe resource URL %s', (resource_url) => {
    expect(validateGroupPost({
      ...valid, kind: 'ressource', resource_url,
    }).ok).toBe(false)
  })
})
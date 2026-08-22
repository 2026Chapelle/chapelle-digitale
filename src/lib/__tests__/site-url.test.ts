import { describe, it, expect } from 'vitest'
import { SITE_URL, siteUrl } from '../site-url'

/**
 * Garde-fou : la base canonique ne doit JAMAIS produire de double slash après le
 * domaine (…org//sitemap.xml, …org//formations). robots.ts et sitemap.ts en
 * dépendent pour émettre des URLs canoniques propres, quel que soit un éventuel
 * slash final sur NEXT_PUBLIC_APP_URL.
 */

/** Compte les `//` apparaissant APRÈS le `://` du protocole. */
function doubleSlashAfterHost(url: string): boolean {
  const afterProtocol = url.replace(/^[a-z]+:\/\//i, '')
  return afterProtocol.includes('//')
}

describe('site-url — base canonique normalisée', () => {
  it('SITE_URL ne se termine jamais par un slash', () => {
    expect(SITE_URL.endsWith('/')).toBe(false)
  })

  it('siteUrl() racine = domaine + "/" (un seul slash)', () => {
    expect(siteUrl('/')).toBe(`${SITE_URL}/`)
    expect(doubleSlashAfterHost(siteUrl('/'))).toBe(false)
  })

  it.each(['/sitemap.xml', '/formations', '/podcast', '/parcours', '/robots.txt'])(
    'siteUrl(%s) ne contient pas de double slash après le host',
    (path) => {
      const url = siteUrl(path)
      expect(url).toBe(`${SITE_URL}${path}`)
      expect(doubleSlashAfterHost(url)).toBe(false)
    },
  )

  it('normalise un chemin sans slash initial', () => {
    expect(siteUrl('formations')).toBe(`${SITE_URL}/formations`)
  })
})

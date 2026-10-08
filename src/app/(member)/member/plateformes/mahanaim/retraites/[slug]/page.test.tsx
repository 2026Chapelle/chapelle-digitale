import { renderToStaticMarkup } from 'react-dom/server'
import * as React from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  redirect,
  notFound,
  getMemberRetreatBySlug,
} = vi.hoisted(() => ({
  redirect: vi.fn((url: string): never => {
    throw new Error(`redirect:${url}`)
  }),
  notFound: vi.fn((): never => {
    throw new Error('not-found')
  }),
  getMemberRetreatBySlug: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect, notFound }))
vi.mock('@/lib/mahanaim/member-retreats-server', () => ({
  CHAMBRE_HAUTE_SLUG: 'chambre-haute-2026',
  getMemberRetreatBySlug,
}))

let MahanaimRetreatPage: typeof import('./page').default

beforeAll(async () => {
  ;(globalThis as typeof globalThis & { React: typeof React }).React = React
  MahanaimRetreatPage = (await import('./page')).default
})

const props = { params: { slug: 'chambre-haute-2026' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Mahanaim retreat detail error mapping', () => {
  it('redirects an unauthenticated visitor to login while preserving the member retreat path', async () => {
    getMemberRetreatBySlug.mockResolvedValueOnce({ status: 'identity_required' })

    await expect(MahanaimRetreatPage(props)).rejects.toThrow(
      'redirect:/login?next=%2Fmember%2Fplateformes%2Fmahanaim%2Fretraites%2Fchambre-haute-2026',
    )
  })

  it('shows a safe explicit member-link error instead of a false 404', async () => {
    getMemberRetreatBySlug.mockResolvedValueOnce({ status: 'member_not_found' })

    const page = await MahanaimRetreatPage(props)

    expect(renderToStaticMarkup(page)).toContain('Compte membre requis')
    expect(notFound).not.toHaveBeenCalled()
  })

  it('uses the 404 boundary only for a genuinely unavailable retreat', async () => {
    getMemberRetreatBySlug.mockResolvedValueOnce({ status: 'not_found' })

    await expect(MahanaimRetreatPage(props)).rejects.toThrow('not-found')
  })

  it('propagates unavailable data access as a server error instead of a false 404', async () => {
    getMemberRetreatBySlug.mockResolvedValueOnce({ status: 'unavailable' })

    await expect(MahanaimRetreatPage(props)).rejects.toThrow('mahanaim_retreat_unavailable')
    expect(notFound).not.toHaveBeenCalled()
  })
})

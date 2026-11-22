import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  validate: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  delivery: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: mocks.cookies,
}))

vi.mock('next/image', () => ({
  default: () => null,
}))

vi.mock('@/lib/admin-auth', () => ({
  isValidAdminToken: mocks.validate,
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}))

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
}))

vi.mock('@/lib/documents/document-delivery-server', () => ({
  getDocumentDelivery: mocks.delivery,
}))

import PreviewPage from './page'

function requestProps(type = 'articles', vue = 'mobile') {
  return {
    params: Promise.resolve({
      type,
      id: 'preview-test-id',
    }),
    searchParams: Promise.resolve({ vue }),
  }
}

describe('Next.js 15 - asynchronous admin preview', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    vi.stubGlobal('React', React)

    mocks.cookies.mockResolvedValue({
      get: () => undefined,
    })

    mocks.validate.mockImplementation(
      (token: unknown) => token === 'valid-test-token',
    )

    mocks.from.mockReturnValue({
      select: mocks.select,
    })

    mocks.select.mockReturnValue({
      eq: mocks.eq,
    })

    mocks.eq.mockReturnValue({
      single: mocks.single,
    })

    mocks.single.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('denies preview without a valid cookie before CMS access', async () => {
    const result = await PreviewPage(requestProps())

    expect(result.props.title).toBe('Accès réservé')
    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.delivery).not.toHaveBeenCalled()
  })

  it('denies preview with an invalid cookie before CMS access', async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'invalid-test-token' }),
    })

    const result = await PreviewPage(requestProps())

    expect(result.props.title).toBe('Accès réservé')
    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('resolves promised route params after admin validation', async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'valid-test-token' }),
    })

    await PreviewPage(requestProps())

    expect(mocks.validate).toHaveBeenCalledWith(
      'valid-test-token',
    )

    expect(mocks.from).toHaveBeenCalledWith(
      'cms_articles',
    )

    expect(mocks.eq).toHaveBeenCalledWith(
      'id',
      'preview-test-id',
    )

    expect(
      mocks.validate.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.from.mock.invocationCallOrder[0],
    )
  })

  it('resolves promised mobile searchParams for a valid preview', async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'valid-test-token' }),
    })

    mocks.single.mockResolvedValue({
      data: {
        id: 'preview-test-id',
        title: 'QA preview document',
        status: 'draft',
      },
      error: null,
    })

    const result = await PreviewPage(requestProps())

    const children = React.Children.toArray(
      result.props.children,
    )

    const container = children.find(
      (child) =>
        React.isValidElement(child) &&
        String(
          (child.props as { className?: string }).className ?? '',
        ).includes('container-royal'),
    )

    expect(React.isValidElement(container)).toBe(true)

    if (React.isValidElement(container)) {
      expect(
        (container.props as { className?: string }).className,
      ).toContain('max-w-[420px]')
    }
  })

  it('rejects an unsupported content type before CMS access', async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'valid-test-token' }),
    })

    await PreviewPage(
      requestProps('unsupported-content-type'),
    )

    expect(mocks.from).not.toHaveBeenCalled()
  })

  it('does not access CMS when the cookies promise rejects', async () => {
    mocks.cookies.mockRejectedValue(
      new Error('request context unavailable'),
    )

    await expect(PreviewPage(requestProps()))
      .rejects.toThrow('request context unavailable')

    expect(mocks.from).not.toHaveBeenCalled()
    expect(mocks.delivery).not.toHaveBeenCalled()
  })

  it('supports preview without optional searchParams', async () => {
    mocks.cookies.mockResolvedValue({
      get: () => ({ value: 'valid-test-token' }),
    })

    await PreviewPage({
      params: Promise.resolve({
        type: 'articles',
        id: 'preview-test-id',
      }),
    })

    expect(mocks.from).toHaveBeenCalledWith(
      'cms_articles',
    )
  })
})

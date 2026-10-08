import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  let result: { data: any[] | null; error: unknown } = { data: [], error: null }
  const query: any = {}
  query.select = vi.fn(() => query)
  query.eq = vi.fn(() => query)
  query.order = vi.fn(() => query)
  query.then = (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)

  return {
    from: vi.fn(() => query),
    query,
    setResult(value: typeof result) { result = value },
  }
})

vi.mock('@/lib/supabase', () => ({ IS_DEMO_MODE: false }))
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mocks.from } }))

import { getAllGivingProducts, getGivingProducts, getGivingWidgetSettings } from '@/lib/giving-server'

describe('Giving server readers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.setResult({ data: [], error: null })
  })

  it('reads active products with the existing active, page, and position query', async () => {
    const product = { id: 'p-1', page: 'dons', is_active: true }
    mocks.setResult({ data: [product], error: null })

    await expect(getGivingProducts('dons')).resolves.toEqual([product])

    expect(mocks.from).toHaveBeenCalledWith('giving_products')
    expect(mocks.query.select).toHaveBeenCalledWith('*')
    expect(mocks.query.eq.mock.calls).toEqual([
      ['is_active', true],
      ['page', 'dons'],
    ])
    expect(mocks.query.order).toHaveBeenCalledWith('position', { ascending: true })
  })

  it('reads all products ordered by page then position without adding filters', async () => {
    const product = { id: 'p-2', page: 'partenariat', is_active: false }
    mocks.setResult({ data: [product], error: null })

    await expect(getAllGivingProducts()).resolves.toEqual([product])

    expect(mocks.from).toHaveBeenCalledWith('giving_products')
    expect(mocks.query.select).toHaveBeenCalledWith('*')
    expect(mocks.query.eq).not.toHaveBeenCalled()
    expect(mocks.query.order.mock.calls).toEqual([
      ['page', { ascending: true }],
      ['position', { ascending: true }],
    ])
  })

  it('merges stored widget settings over the existing defaults', async () => {
    mocks.setResult({
      data: [
        { key: 'locale', value: 'en' },
        { key: 'primary_color', value: '#123456' },
      ],
      error: null,
    })

    await expect(getGivingWidgetSettings()).resolves.toMatchObject({
      locale: 'en',
      primary_color: '#123456',
      store_domain: 'zrqcqzjz.mychariow.shop',
      script_url: 'https://js.chariowcdn.com/v1/widget.min.js',
      css_url: 'https://js.chariowcdn.com/v1/widget.min.css',
    })

    expect(mocks.from).toHaveBeenCalledWith('giving_widget_settings')
    expect(mocks.query.select).toHaveBeenCalledWith('key, value')
  })
})

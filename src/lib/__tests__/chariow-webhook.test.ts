/**
 * Tests comportementaux — webhook Chariow (sécurité + idempotence + persistance).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const from = vi.fn()
const logActivity = vi.fn()
const notifyUser = vi.fn()
const sendEmail = vi.fn()

vi.mock('@/lib/supabase', () => ({
  IS_DEMO_MODE: false,
  supabaseAdmin: { from: (...args: unknown[]) => from(...args) },
}))

vi.mock('@/lib/activity', () => ({
  logActivity: (...args: unknown[]) => logActivity(...args),
}))

vi.mock('@/lib/notify', () => ({
  notifyUser: (...args: unknown[]) => notifyUser(...args),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}))

vi.mock('@/lib/email-templates', () => ({
  donationReceiptEmail: () => ({ subject: 'r', html: '<p>r</p>' }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn(() => ({ ok: true, remaining: 59, retryAfterSec: 0 })),
  clientIp: vi.fn(() => '127.0.0.1'),
}))

import { POST } from '@/app/api/webhook/chariow/route'

function validSalePayload(overrides: Record<string, unknown> = {}) {
  return {
    event: 'successful.sale',
    sale: {
      id: 'sale-stable-1',
      status: 'completed',
      amount: { value: 5000, currency: 'FCFA' },
    },
    customer: { email: 'donor@example.com', name: 'Donor' },
    product: { id: 'prod-1', name: 'Don' },
    ...overrides,
  }
}

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  return new NextRequest('http://localhost/api/webhook/chariow', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: raw,
  })
}

describe('POST /api/webhook/chariow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv('CHARIOW_WEBHOOK_SECRET', '')
    vi.stubEnv('CHARIOW_WEBHOOK_HMAC_SECRET', '')
    // Vider les secrets (stubEnv('') est truthy) — delete explicite pour fail-closed.
    delete process.env.CHARIOW_WEBHOOK_SECRET
    delete process.env.CHARIOW_WEBHOOK_HMAC_SECRET
    logActivity.mockResolvedValue(undefined)
    notifyUser.mockResolvedValue(undefined)
    sendEmail.mockResolvedValue({ ok: true })

    // Default chain : no existing don, insert ok, no receipt path issues.
    from.mockImplementation((table: string) => {
      if (table === 'giving_transactions_log') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'dons') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'don-1', recu_envoye: true }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      if (table === 'marketplace_products' || table === 'product_purchases') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    delete process.env.CHARIOW_WEBHOOK_SECRET
    delete process.env.CHARIOW_WEBHOOK_HMAC_SECRET
  })

  it('production sans secret => 500 fail-closed', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.CHARIOW_WEBHOOK_SECRET
    delete process.env.CHARIOW_WEBHOOK_HMAC_SECRET
    const res = await POST(makeReq(validSalePayload()))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.message).toMatch(/configuration/i)
  })

  it('secret simple invalide => 401', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_SECRET', 'expected-secret')
    const res = await POST(makeReq(validSalePayload(), { 'x-chariow-secret': 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('HMAC invalide => 401', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_HMAC_SECRET', 'hmac-secret')
    const res = await POST(makeReq(validSalePayload(), { 'x-chariow-signature': 'deadbeef' }))
    expect(res.status).toBe(401)
  })

  it('JSON invalide => 400', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_SECRET', 's')
    const res = await POST(makeReq('{not-json', { 'x-chariow-secret': 's' }))
    expect(res.status).toBe(400)
  })

  it('successful.sale completed sans sale.id => 400', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_SECRET', 's')
    const payload = validSalePayload()
    delete (payload.sale as any).id
    const res = await POST(makeReq(payload, { 'x-chariow-secret': 's' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.message).toMatch(/sale\.id/i)
  })

  it('HMAC valide + payload OK => recorded true', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_HMAC_SECRET', 'hmac-secret')
    const payload = validSalePayload()
    const raw = JSON.stringify(payload)
    const sig = createHmac('sha256', 'hmac-secret').update(raw).digest('hex')
    const res = await POST(
      new NextRequest('http://localhost/api/webhook/chariow', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-chariow-signature': sig,
        },
        body: raw,
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.recorded).toBe(true)
    expect(body.reference).toBe('sale-stable-1')
  })

  it('doublon sale.id => pas de double insert (existing)', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_SECRET', 's')
    const insert = vi.fn()
    from.mockImplementation((table: string) => {
      if (table === 'giving_transactions_log') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'dons') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'don-existing', recu_envoye: true },
            error: null,
          }),
          insert,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const res = await POST(makeReq(validSalePayload(), { 'x-chariow-secret': 's' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.recorded).toBe(true)
    expect(insert).not.toHaveBeenCalled()
    expect(logActivity).not.toHaveBeenCalled()
  })

  it('erreur DB non-23505 sur insert => 500', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('CHARIOW_WEBHOOK_SECRET', 's')
    from.mockImplementation((table: string) => {
      if (table === 'giving_transactions_log') {
        return { insert: vi.fn().mockResolvedValue({ error: null }) }
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'dons') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'XX000', message: 'db down' },
              }),
            }),
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })

    const res = await POST(makeReq(validSalePayload(), { 'x-chariow-secret': 's' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.message).toMatch(/persistance/i)
  })
})

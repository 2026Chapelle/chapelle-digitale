import { describe, it, expect } from 'vitest'
import {
  CONFIRM_EMAIL_REDIRECT,
  isValidAuthEmail,
  mapLoginError,
  mapResendError,
  resendConfirmationEmail,
  createPendingGuard,
  type ResendCapableClient,
} from '@/lib/auth/confirm-email'

/** Fabrique un client factice dont resend() renvoie l'erreur fournie. */
function fakeClient(
  behavior: { error?: { message: string; status?: number } | null; throw?: unknown } = {},
  spy?: (args: unknown) => void,
): ResendCapableClient {
  return {
    auth: {
      resend: async (args) => {
        spy?.(args)
        if (behavior.throw) throw behavior.throw
        return { error: behavior.error ?? null }
      },
    },
  }
}

describe('CONFIRM_EMAIL_REDIRECT', () => {
  it('pointe vers le callback canonique avec next=/member/dashboard', () => {
    expect(CONFIRM_EMAIL_REDIRECT).toBe(
      'https://citadelle.chapelleduroyaume.org/auth/callback?next=/member/dashboard',
    )
  })
})

describe('isValidAuthEmail', () => {
  it('accepte une adresse valide et rejette le vide/invalide', () => {
    expect(isValidAuthEmail('a@b.co')).toBe(true)
    expect(isValidAuthEmail('  a@b.co  ')).toBe(true)
    expect(isValidAuthEmail('')).toBe(false)
    expect(isValidAuthEmail(null)).toBe(false)
    expect(isValidAuthEmail('pasunemail')).toBe(false)
  })
})

describe('mapLoginError', () => {
  it('mappe « Invalid login credentials » en FR sans resend', () => {
    const r = mapLoginError('Invalid login credentials')
    expect(r.kind).toBe('invalid_credentials')
    expect(r.message).toBe('Email ou mot de passe incorrect')
    expect(r.needsConfirm).toBe(false)
  })

  it('mappe « Email not confirmed » en FR + needsConfirm', () => {
    const r = mapLoginError('Email not confirmed')
    expect(r.kind).toBe('email_not_confirmed')
    expect(r.needsConfirm).toBe(true)
    expect(r.message).toMatch(/pas encore confirmée/i)
    expect(r.message).not.toMatch(/not confirmed/i) // jamais d'anglais brut
  })

  it('renvoie un fallback FR pour toute autre erreur', () => {
    expect(mapLoginError('Some other error').kind).toBe('other')
    expect(mapLoginError('').message).toMatch(/erreur/i)
  })
})

describe('mapResendError', () => {
  it('détecte le rate-limit (status 429 ou message)', () => {
    expect(mapResendError('x', 429)).toMatch(/patiente/i)
    expect(mapResendError('For security purposes, you can only request this after 51 seconds')).toMatch(/patiente/i)
  })
  it('message générique sinon', () => {
    expect(mapResendError('boom')).toMatch(/impossible d'envoyer/i)
  })
})

describe('resendConfirmationEmail', () => {
  it('refuse un email invalide sans appeler le client', async () => {
    let called = false
    const client = fakeClient({}, () => { called = true })
    const out = await resendConfirmationEmail(client, 'pasunemail')
    expect(out.ok).toBe(false)
    expect(called).toBe(false)
    expect(out.message).toMatch(/adresse email valide/i)
  })

  it('succès : type signup + redirect canonique + message FR', async () => {
    let seen: any = null
    const client = fakeClient({ error: null }, (a) => { seen = a })
    const out = await resendConfirmationEmail(client, '  member@test.co ')
    expect(out.ok).toBe(true)
    expect(out.message).toMatch(/renvoyé/i)
    expect(seen.type).toBe('signup')
    expect(seen.email).toBe('member@test.co') // trimé
    expect(seen.options.emailRedirectTo).toBe(CONFIRM_EMAIL_REDIRECT)
  })

  it('erreur rate-limit → message patiente', async () => {
    const client = fakeClient({ error: { message: 'rate limit exceeded', status: 429 } })
    const out = await resendConfirmationEmail(client, 'member@test.co')
    expect(out.ok).toBe(false)
    expect(out.message).toMatch(/patiente/i)
  })

  it('exception réseau → message propre, ne jette pas', async () => {
    const client = fakeClient({ throw: new Error('network down') })
    const out = await resendConfirmationEmail(client, 'member@test.co')
    expect(out.ok).toBe(false)
    expect(out.message).toMatch(/impossible/i)
  })
})

describe('createPendingGuard (anti double-clic)', () => {
  it('ignore un second appel tant que le premier est en cours', async () => {
    const guard = createPendingGuard()
    let resolve!: () => void
    const gate = new Promise<void>((r) => { resolve = r })
    let runs = 0
    const first = guard.run(async () => { runs++; await gate; return 'A' })
    expect(guard.isPending()).toBe(true)
    const second = await guard.run(async () => { runs++; return 'B' }) // bloqué
    expect(second).toBeUndefined()
    expect(runs).toBe(1)
    resolve()
    expect(await first).toBe('A')
    expect(guard.isPending()).toBe(false)
    // une fois libéré, un nouvel appel passe
    expect(await guard.run(async () => 'C')).toBe('C')
  })
})

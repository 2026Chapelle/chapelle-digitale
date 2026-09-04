import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '..', '..', '..')
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('production auth and offline release regressions', () => {
  it('has a dedicated production build environment gate', () => {
    expect(existsSync(resolve(root, 'scripts/require-production-build-env.mjs'))).toBe(true)
    expect(source('package.json')).toContain('"build:production"')
  })

  it('rejects missing public production build configuration without printing values', () => {
    const result = spawnSync(process.execPath, ['scripts/require-production-build-env.mjs'], {
      cwd: root,
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' },
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('NEXT_PUBLIC_SUPABASE_URL_MISSING')
  })

  it('accepts the expected Supabase project with a non-placeholder public key', () => {
    const result = spawnSync(process.execPath, ['scripts/require-production-build-env.mjs'], {
      cwd: root,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'https://nvyuyffywnuollaxguen.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJ.production-build-validation.public-key',
      },
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('validated')
  })

  it('keeps browser Supabase auth paths available when the public build config is valid', () => {
    expect(source('src/lib/supabase-browser.ts')).toContain('createClientComponentClient()')
    expect(source('src/app/(admin)/admin/login/page.tsx')).toContain('client.auth.signInWithPassword')
    expect(source('src/app/(admin)/admin/forgot-password/page.tsx')).toContain('client.auth.resetPasswordForEmail')
  })

  it('labels online and offline resource actions unambiguously', () => {
    expect(source('src/app/(member)/member/dashboard/ressources/page.tsx')).toContain('Écouter')
    expect(source('src/components/features/offline/OfflineDownloadButton.tsx')).toContain('Télécharger hors ligne')
  })

  it('keeps the Offline button on the canonical authorize-proxy-Blob flow', () => {
    const button = source('src/components/features/offline/OfflineDownloadButton.tsx')
    const manager = source('src/lib/offline/manager.ts')
    expect(button).not.toContain('window.open')
    expect(button).not.toContain('r.url')
    expect(manager).toContain('/api/member/offline/authorize')
    expect(manager).toContain('/api/member/offline/download?contentId=')
    expect(manager).toContain('db.putBlob')
  })

  it('preserves the offline E2E production guard', () => {
    const guard = source('src/lib/offline/e2e-guard.ts')
    expect(guard).toContain("env.OFFLINE_E2E_MODE !== 'true'")
    expect(guard).toContain('nvyuyffywnuollaxguen')
  })
})

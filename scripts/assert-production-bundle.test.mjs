import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const script = path.resolve('scripts/assert-production-bundle.mjs')
assert.ok(existsSync(script), 'post-build bundle guard script must exist')

const root = mkdtempSync(path.join(os.tmpdir(), 'citadelle-bundle-guard-'))
const assets = path.join(root, 'static')
const outputFile = path.join(assets, 'chunks', 'app.js')
mkdirSync(path.dirname(outputFile), { recursive: true })

function run(content) {
  writeFileSync(outputFile, content)
  return spawnSync(process.execPath, [script, '--assets-dir', assets], { encoding: 'utf8' })
}

function expectDangerousLocal(content) {
  const result = run(content)
  const output = `${result.stdout}${result.stderr}`
  assert.notEqual(result.status, 0, 'effective local Supabase configuration must fail')
  assert.match(output, /DANGEROUS_SUPABASE_LOCAL_HITS=[1-9][0-9]*/)
  assert.match(output, /BROWSER_BUNDLE_LOCAL_SUPABASE=YES/)
  assert.match(output, /BUNDLE_ENV_VALIDATION=FAIL/)
  return output
}

try {
  const productionUrl = 'https://nvyuyffywnuollaxguen.supabase.co'
  const productionRef = 'nvyuyffywnuollaxguen'

  for (const localUrl of ['http://127.0.0.1:54321', 'http://localhost:54321']) {
    const output = expectDangerousLocal(`const supabaseUrl="${localUrl}";createClient(supabaseUrl,anonKey);const productionRef="${productionRef}";`)
    assert.ok(!output.includes('anonKey'), 'bundle guard must not print key-like values')
  }

  expectDangerousLocal(`const storageKey="sb-127-auth-token";const endpoint="${productionUrl}";`)

  const wrongProject = run(`const supabaseUrl="https://other-project.supabase.co";createClient(supabaseUrl,anonKey);const productionRef="${productionRef}";`)
  assert.notEqual(wrongProject.status, 0)
  assert.match(wrongProject.stdout + wrongProject.stderr, /UNAUTHORIZED_SUPABASE_PROJECT_HITS=[1-9][0-9]*/)
  assert.match(wrongProject.stdout + wrongProject.stderr, /BUNDLE_ENV_VALIDATION=FAIL/)

  const missingProduction = run('const supabaseUrl="https://other-project.supabase.co";createClient(supabaseUrl,anonKey);')
  assert.notEqual(missingProduction.status, 0)
  assert.match(missingProduction.stdout + missingProduction.stderr, /PROD_PROJECT_ASSET_HITS=0/)

  const configuredClient = path.join(assets, 'chunks', 'configured-client.js')
  writeFileSync(configuredClient, `const supabaseUrl="${productionUrl}";createClient(supabaseUrl,anonKey);`)
  const internalFallback = run('const GOTRUE_URL="http://localhost:9999";')
  rmSync(configuredClient)
  assert.equal(internalFallback.status, 0, internalFallback.stderr)
  assert.match(internalFallback.stdout, /RAW_LOOPBACK_TEXT_HITS=[1-9][0-9]*/)
  assert.match(internalFallback.stdout, /DANGEROUS_SUPABASE_LOCAL_HITS=0/)
  assert.match(internalFallback.stdout, /BROWSER_BUNDLE_LOCAL_SUPABASE=NO/)
  assert.match(internalFallback.stdout, /BROWSER_BUNDLE_PRODUCTION_SUPABASE=YES/)
  assert.match(internalFallback.stdout, /BUNDLE_ENV_VALIDATION=PASS/)

  const businessLocalhost = run(`const internalHostRule="localhost";const supabaseUrl="${productionUrl}";createClient(supabaseUrl,anonKey);`)
  assert.equal(businessLocalhost.status, 0, businessLocalhost.stderr)
  assert.match(businessLocalhost.stdout, /DANGEROUS_SUPABASE_LOCAL_HITS=0/)
  assert.match(businessLocalhost.stdout, /BUNDLE_ENV_VALIDATION=PASS/)

  const productionEndpoint = run(`const supabaseUrl="${productionUrl}";createClient(supabaseUrl,anonKey);`)
  assert.equal(productionEndpoint.status, 0, productionEndpoint.stderr)
  assert.match(productionEndpoint.stdout, /DANGEROUS_SUPABASE_LOCAL_HITS=0/)
  assert.match(productionEndpoint.stdout, /BROWSER_BUNDLE_PRODUCTION_SUPABASE=YES/)
  assert.match(productionEndpoint.stdout, /BUNDLE_ENV_VALIDATION=PASS/)

  const secretMarker = 'NEVER_PRINT_THIS_FAKE_SECRET_91f0'
  const secretScan = run(`const supabaseUrl="http://127.0.0.1:54321";createClient(supabaseUrl,"${secretMarker}");const productionRef="${productionRef}";`)
  assert.ok(!`${secretScan.stdout}${secretScan.stderr}`.includes(secretMarker), 'must not print asset contents')
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log('production bundle guard tests passed')

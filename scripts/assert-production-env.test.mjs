import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const script = path.resolve('scripts/assert-production-env.mjs')
const safeTestKey = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.c2lnbmF0dXJlLTdmM2E'
const run = (url, key = safeTestKey) =>
  spawnSync(process.execPath, [script], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
    },
    encoding: 'utf8',
  })

const valid = run('https://nvyuyffywnuollaxguen.supabase.co')
assert.equal(valid.status, 0, valid.stderr)
assert.match(valid.stdout, /CITADELLE_PROD_ENV_GUARD=PASS/)
assert.ok(!`${valid.stdout}${valid.stderr}`.includes(safeTestKey))

for (const url of [
  'https://localhost/',
  'https://auth.localhost/',
  'https://localhost./',
  'https://127.0.0.1/',
  'https://127.15.2.3/',
  'https://127.1/',
  'https://[::1]/',
  'https://[0:0:0:0:0:0:0:1]/',
  'https://[::ffff:127.0.0.1]/',
  'https://[::ffff:7f00:1]/',
  'https://0.0.0.0/',
]) {
  const result = run(url)
  assert.notEqual(result.status, 0, `must reject ${url}`)
  assert.match(result.stdout + result.stderr, /CITADELLE_PROD_ENV_GUARD=FAIL/)
  assert.match(result.stdout + result.stderr, /INVALID=NEXT_PUBLIC_SUPABASE_URL/, `must identify a local URL for ${url}`)
  assert.ok(!`${result.stdout}${result.stderr}`.includes(safeTestKey), 'must not print the anon key')
  assert.ok(!`${result.stdout}${result.stderr}`.includes(url), 'must not print the configured URL')
}

for (const url of [
  'https://other-project.supabase.co',
  'https://nvyuyffywnuollaxguen.supabase.co.evil.example',
  'https://nvyuyffywnuollaxguen.supabase.co@evil.example',
  'not-a-url',
]) {
  const result = run(url)
  assert.notEqual(result.status, 0, `must reject invalid project URL ${url}`)
  assert.match(result.stdout + result.stderr, /CITADELLE_PROD_ENV_GUARD=FAIL/)
  assert.ok(!`${result.stdout}${result.stderr}`.includes(url), 'must not print the configured URL')
}

for (const key of ['placeholder', 'your-anon-key', 'changeme', 'dummy-key', 'example-key']) {
  const result = run('https://nvyuyffywnuollaxguen.supabase.co', key)
  assert.notEqual(result.status, 0, `must reject placeholder key ${key}`)
  assert.match(result.stdout + result.stderr, /CITADELLE_PROD_ENV_GUARD=FAIL/)
  assert.ok(!`${result.stdout}${result.stderr}`.includes(key), 'must not print the configured key')
}

console.log('production env guard tests passed')

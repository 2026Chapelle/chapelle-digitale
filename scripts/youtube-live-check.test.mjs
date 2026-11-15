import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const script = resolve(process.cwd(), 'scripts/youtube-live-check.mjs')
const source = readFileSync(script, 'utf8')

test('the OAuth check script never prints secret values and performs no mutation', () => {
  assert.match(source, /const redact = /)
  assert.match(source, /console\.log\(redact\(/)
  assert.doesNotMatch(source, /console\.log\(JSON\.stringify\(\w+\)\)/)
  assert.doesNotMatch(source, /method:\s*'(POST|PATCH|PUT|DELETE)'/i.source.replace("'POST|", "'(PATCH|PUT|DELETE)'") ? /writeFileSync|supabase|method:\s*'(PATCH|PUT|DELETE)'/ : /x/)
})

test('without configuration it exits 2 with only booleans and a code', () => {
  const run = spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH }, encoding: 'utf8' })
  assert.equal(run.status, 2)
  const out = JSON.parse(run.stdout)
  assert.deepEqual(out, { configured: { YOUTUBE_OAUTH_CLIENT_ID: false, YOUTUBE_OAUTH_CLIENT_SECRET: false, YOUTUBE_OAUTH_REFRESH_TOKEN: false, YOUTUBE_CHANNEL_ID: false }, error: 'youtube_oauth_not_configured' })
})

test('with fake credentials and no network, the output contains no credential value', () => {
  const env = { PATH: process.env.PATH, YOUTUBE_OAUTH_CLIENT_ID: 'fake-client-id-123456', YOUTUBE_OAUTH_CLIENT_SECRET: 'fake-secret-abcdef', YOUTUBE_OAUTH_REFRESH_TOKEN: 'fake-refresh-xyz789', YOUTUBE_CHANNEL_ID: 'UCfake', HTTPS_PROXY: 'http://127.0.0.1:9', https_proxy: 'http://127.0.0.1:9' }
  const run = spawnSync(process.execPath, ['--dns-result-order=ipv4first', script], { env, encoding: 'utf8', timeout: 30_000 })
  const combined = `${run.stdout}\n${run.stderr}`
  for (const secret of ['fake-client-id-123456', 'fake-secret-abcdef', 'fake-refresh-xyz789']) assert.ok(!combined.includes(secret), `secret leaked: ${secret}`)
  assert.notEqual(run.status, 0)
  assert.match(run.stdout, /"error": "youtube_[a-z0-9_]+"/)
})

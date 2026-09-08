import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'

const script = path.resolve('scripts/assert-production-env.mjs')
const run = (env) => execFileSync(process.execPath, [script], { env: { ...process.env, NODE_ENV: 'production', ...env }, encoding: 'utf8' })
assert.throws(() => run({ NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' }))
assert.match(run({ NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key' }), /CITADELLE_PROD_ENV_GUARD=PASS/)
console.log('production env guard tests passed')

#!/usr/bin/env node
/**
 * LIVE & REPLAY V1 — Test RÉEL de la fonction `acquire_sync_lock` (migration 20261115120000_sync_locks).
 *
 *   SYNC_LOCK_TEST_DATABASE_URL=postgres://... node --test scripts/sync-lock.db.test.mjs
 *
 * Refuse le projet de PRODUCTION (ref nvyuyffywnuollaxguen). Lance N sessions psql CONCURRENTES qui
 * tentent d'acquérir le même verrou : exactement UNE doit obtenir `true`. Vérifie aussi la libération
 * par le détenteur seul, la ré-entrance du même owner et l'expiration du bail.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const url = (process.env.SYNC_LOCK_TEST_DATABASE_URL || '').trim()
const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261115120000_sync_locks.sql'), 'utf8')

function assertSafeTarget(value) {
  assert.ok(value, 'SYNC_LOCK_TEST_DATABASE_URL est requis')
  const parsed = new URL(value)
  assert.ok(['postgres:', 'postgresql:'].includes(parsed.protocol), 'URL PostgreSQL attendue')
  assert.ok(!`${parsed.hostname}${parsed.username}${parsed.pathname}`.includes('nvyuyffywnuollaxguen'), 'REFUS : base de production')
}

function psql(sqlText) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('psql', [url, '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-A', '-t'], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = '', err = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { err += d })
    child.on('close', (code) => (code === 0 ? resolveRun(out.trim()) : reject(new Error(`psql failed (${code}): ${err.trim()}`))))
    child.stdin.end(sqlText)
  })
}

test('sync_locks: une seule acquisition parmi N sessions concurrentes', async () => {
  assertSafeTarget(url)
  await psql(migration)
  await psql(`delete from public.sync_locks where name like 'test:%'`)
  const N = 24
  const results = await Promise.all(Array.from({ length: N }, (_, i) => psql(`select public.acquire_sync_lock('test:concurrent', 'owner-${i}', 60)`)))
  const winners = results.filter((r) => r === 't')
  assert.equal(winners.length, 1, `exactement un gagnant attendu, obtenu ${winners.length} (${results.join(',')})`)
  const row = await psql(`select owner from public.sync_locks where name = 'test:concurrent'`)
  assert.match(row, /^owner-\d+$/)
})

test('sync_locks: ré-entrance du détenteur, refus des autres, libération par le détenteur seul', async () => {
  assertSafeTarget(url)
  await psql(`delete from public.sync_locks where name like 'test:%'`)
  assert.equal(await psql(`select public.acquire_sync_lock('test:lease', 'A', 60)`), 't')
  assert.equal(await psql(`select public.acquire_sync_lock('test:lease', 'A', 60)`), 't', 'le même owner peut renouveler')
  assert.equal(await psql(`select public.acquire_sync_lock('test:lease', 'B', 60)`), 'f')
  assert.equal(await psql(`select public.release_sync_lock('test:lease', 'B')`), 'f', 'B ne peut pas libérer le bail de A')
  assert.equal(await psql(`select public.release_sync_lock('test:lease', 'A')`), 't')
  assert.equal(await psql(`select public.acquire_sync_lock('test:lease', 'B', 60)`), 't', 'libre après libération')
})

test('sync_locks: expiration du bail (TTL) puis reprise par un autre owner', async () => {
  assertSafeTarget(url)
  await psql(`delete from public.sync_locks where name like 'test:%'`)
  assert.equal(await psql(`select public.acquire_sync_lock('test:ttl', 'A', 5)`), 't')
  assert.equal(await psql(`select public.acquire_sync_lock('test:ttl', 'B', 5)`), 'f')
  // le minimum accepté est 5 s : on simule l'expiration en reculant le bail (service role uniquement)
  await psql(`update public.sync_locks set locked_until = clock_timestamp() - interval '1 second' where name = 'test:ttl'`)
  assert.equal(await psql(`select public.acquire_sync_lock('test:ttl', 'B', 5)`), 't')
})

test('sync_locks: aucune policy publique, exécution réservée au service_role', async () => {
  assertSafeTarget(url)
  assert.equal(await psql(`select count(*) from pg_policies where tablename = 'sync_locks'`), '0')
  assert.equal(await psql(`select relrowsecurity::text from pg_class where relname = 'sync_locks'`), 'true')
  assert.equal(await psql(`select has_function_privilege('anon', 'public.acquire_sync_lock(text,text,integer)', 'EXECUTE')::text`), 'false')
  assert.equal(await psql(`select has_function_privilege('authenticated', 'public.acquire_sync_lock(text,text,integer)', 'EXECUTE')::text`), 'false')
  assert.equal(await psql(`select has_function_privilege('service_role', 'public.acquire_sync_lock(text,text,integer)', 'EXECUTE')::text`), 'true')
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { openSqlSession, sql } from './live-reactions-db-harness.mjs'
const deadline = "clock_timestamp() + interval '1 minute'"
const one = (x) => JSON.parse(x.trim())
async function scenario({ actors, lives }, body) {
  const a = actors.map((x) => `'${x}'`).join(','); const l = lives.map((x) => `'${x}'`).join(',')
  const clean = async () => { await sql(`delete from public.live_reaction_events where live_key in (${l})`); await sql(`delete from public.live_reaction_actor_totals where live_key in (${l}) and actor_key in (${a})`); await sql(`delete from public.live_reaction_actor_limits where actor_key in (${a})`); await sql(`delete from public.live_reaction_runs where live_key in (${l})`) }
  await clean(); try { await body() } finally { await clean() }
}
const record = (l, a, r = 'fire') => sql(`select public.live_reaction_record('${l}','${a}','${r}',${deadline})`)
test('acceptance and unique versus actions use isolated state', async () => { const k={actors:['member:11111111-1111-4111-8111-111111111111'],lives:['youtube:AAA111BBB22']}; await scenario(k,async()=>{assert.equal(one(await record(k.lives[0],k.actors[0])).accepted,true);assert.equal(one(await record(k.lives[0],k.actors[0])).accepted,true);const s=one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`));assert.deepEqual([s.stats.uniqueActors,s.stats.totalActions,s.stats.uniqueByType.fire,s.stats.actionsByType.fire],[1,2,1,2])}) })
test('three-in-ten global quota rejects fourth without extension', async () => { const k={actors:['member:22222222-2222-4222-8222-222222222222'],lives:['youtube:CCC333DDD44','youtube:EEE555FFF66']}; await scenario(k,async()=>{one(await record(k.lives[0],k.actors[0]));one(await record(k.lives[1],k.actors[0]));one(await record(k.lives[0],k.actors[0]));const before=await sql(`select accepted_at from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`);const r=one(await record(k.lives[1],k.actors[0]));assert.equal(r.reason,'rate_limited');assert.ok(r.retryAfterMs>0&&r.retryAfterMs<10000);assert.equal(await sql(`select accepted_at from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`),before)}) })
test('boundary, anonymous projection and sixth reaction use isolated state', async () => { const k={actors:['member:33333333-3333-4333-8333-333333333333'],lives:['youtube:GGG777HHH88']}; await scenario(k,async()=>{assert.equal((await sql(`select cardinality(public.live_reaction_window(array[clock_timestamp()-interval '10 seconds'],clock_timestamp()))`)).trim(),'0');assert.equal((await sql("select string_agg(column_name,',' order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='live_reaction_events'")).trim(),'event_id,live_key,reaction,accepted_at');await assert.rejects(()=>record(k.lives[0],k.actors[0],'sparkle'))}) })

test('serializes concurrent admissions across independent postgres sessions', async () => {
  const k={actors:['member:44444444-4444-4444-8444-444444444444'],lives:['youtube:III999JJJ00']}; let controller; let contenderA; let contenderB
  await scenario(k,async()=>{ try {
    one(await record(k.lives[0],k.actors[0],'prayer')); one(await record(k.lives[0],k.actors[0],'fire'))
    const beforeEvents=Number((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim())
    const beforeActions=Number((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}' and actor_key='${k.actors[0]}'`)).trim())
    controller=await openSqlSession(); contenderA=await openSqlSession(); contenderB=await openSqlSession()
    const held=controller.sql(`select 1 from public.live_reaction_actor_limits where actor_key='${k.actors[0]}' for update; select pg_sleep(0.2)`)
    const a=contenderA.sql(`select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','heart',${deadline})`)
    const b=contenderB.sql(`select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','praise',${deadline})`)
    await held; const results=[one(await a),one(await b)]; assert.equal(results.filter((r)=>r.accepted).length,1); assert.equal(results.filter((r)=>!r.accepted).length,1)
    assert.equal((await sql(`select cardinality(accepted_at) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim(),'3')
    assert.equal(Number((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim())-beforeEvents,1)
    assert.equal(Number((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}' and actor_key='${k.actors[0]}'`)).trim())-beforeActions,1)
  } finally { try { await controller?.sql('rollback') } catch {} await controller?.close(); await contenderA?.close(); await contenderB?.close() } })
})

const task3Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const task3Literal = (value) => `'${String(value).replaceAll("'", "''")}'`

async function task3WaitFor(check, label, { timeoutMs = 900, intervalMs = 20 } = {}) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await check()) return
    await task3Sleep(intervalMs)
  }
  throw new Error(`timed out waiting for ${label}`)
}

async function task3WaitForActivity(session, applicationNames, predicateSql, label, options) {
  const names = applicationNames.map(task3Literal).join(',')
  await task3WaitFor(async () => {
    const count = Number((await session.sql(`select count(*) from pg_catalog.pg_stat_activity where application_name in (${names}) and (${predicateSql})`)).trim())
    return count === applicationNames.length
  }, label, options)
}

async function task3CloseSessions(...sessions) {
  for (const session of sessions) {
    try { await session?.close() } catch {}
  }
}

test('admin aggregate reads persisted unique actors and action totals without identity fields', async () => {
  const k = { actors: ['member:c1111111-1111-4111-8111-111111111111'], lives: ['youtube:ADM111CNT22'] }
  await scenario(k, async () => {
    assert.equal(one(await record(k.lives[0], k.actors[0], 'prayer')).accepted, true)
    assert.equal(one(await record(k.lives[0], k.actors[0], 'prayer')).accepted, true)
    assert.equal(one(await record(k.lives[0], k.actors[0], 'fire')).accepted, true)
    const aggregate = one(await sql(`select public.live_reaction_admin_counts('${k.lives[0]}')`))
    assert.deepEqual(
      [aggregate.uniqueActors, aggregate.totalActions, aggregate.uniqueByType.prayer, aggregate.actionsByType.prayer, aggregate.uniqueByType.fire, aggregate.actionsByType.fire],
      [1, 3, 1, 2, 1, 1],
    )
    assert.deepEqual(Object.keys(aggregate).sort(), ['actionsByType', 'totalActions', 'uniqueActors', 'uniqueByType'])
    assert.equal(JSON.stringify(aggregate).includes('actor_key'), false)
    assert.equal(JSON.stringify(aggregate).includes('member:'), false)
    assert.equal(JSON.stringify(aggregate).includes('guest:'), false)
  })
})

test('a rate-limited first touch does not manufacture a new run', async () => {
  const k = {
    actors: ['member:c2222222-2222-4222-8222-222222222222'],
    lives: ['youtube:RAT111LIM22', 'youtube:NEW333RUN44'],
  }
  await scenario(k, async () => {
    one(await record(k.lives[0], k.actors[0], 'prayer'))
    one(await record(k.lives[0], k.actors[0], 'fire'))
    one(await record(k.lives[0], k.actors[0], 'heart'))
    const beforeTimes = await sql(`select accepted_at from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)
    const beforeEvents = (await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim()
    const beforeActions = (await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim()
    const rejected = one(await record(k.lives[1], k.actors[0], 'praise'))
    assert.equal(rejected.accepted, false)
    assert.equal(rejected.reason, 'rate_limited')
    const retryRemainingAfter = Number((await sql(`select greatest(1,ceil(extract(epoch from (accepted_at[1]+interval '10 seconds'-clock_timestamp()))*1000)::bigint) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim())
    assert.ok(rejected.retryAfterMs >= retryRemainingAfter)
    assert.ok(rejected.retryAfterMs - retryRemainingAfter < 500)
    assert.equal(await sql(`select accepted_at from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`), beforeTimes)
    assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), beforeEvents)
    assert.equal((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim(), beforeActions)
    assert.equal((await sql(`select count(*) from public.live_reaction_runs where live_key='${k.lives[1]}'`)).trim(), '0')
  })
})

test('real admission prunes an oldest timestamp that crossed the ten-second boundary', async () => {
  const k = { actors: ['member:c3333333-3333-4333-8333-333333333333'], lives: ['youtube:EXP555IRY66'] }
  await scenario(k, async () => {
    one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
    await sql(`insert into public.live_reaction_actor_limits(actor_key,accepted_at,updated_at) values ('${k.actors[0]}',array[clock_timestamp()-interval '9.9 seconds',clock_timestamp()-interval '1 second',clock_timestamp()-interval '500 milliseconds'],clock_timestamp())`)
    await sql("select pg_sleep(0.15)")
    const result = one(await record(k.lives[0], k.actors[0], 'fire'))
    assert.equal(result.accepted, true)
    assert.equal((await sql(`select cardinality(accepted_at) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim(), '3')
    assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '1')
  })
})

test('simultaneous first run creation keeps one run while different actors proceed independently', async () => {
  const k = {
    actors: [
      'member:c4444444-4444-4444-8444-444444444441',
      'member:c4444444-4444-4444-8444-444444444442',
    ],
    lives: ['youtube:FIRST00RUN1'],
  }
  await scenario(k, async () => {
    const sessions = [await openSqlSession(), await openSqlSession()]
    try {
      const startEpoch = (await sql("select extract(epoch from clock_timestamp()+interval '350 milliseconds')")).trim()
      const calls = [
        sessions[0].sql(`select pg_sleep(greatest(0,extract(epoch from (to_timestamp(${startEpoch})-clock_timestamp())))); select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','prayer',${deadline})`),
        sessions[1].sql(`select pg_sleep(greatest(0,extract(epoch from (to_timestamp(${startEpoch})-clock_timestamp())))); select public.live_reaction_record('${k.lives[0]}','${k.actors[1]}','fire',${deadline})`),
      ]
      const results = (await Promise.all(calls)).map(one)
      assert.deepEqual(results.map((result) => result.accepted), [true, true])
      assert.equal((await sql(`select count(*) from public.live_reaction_runs where live_key='${k.lives[0]}'`)).trim(), '1')
      assert.equal((await sql(`select count(*) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim(), '2')
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '2')
    } finally {
      await task3CloseSessions(...sessions.reverse())
    }
  })
})

test('twenty independent sessions admit exactly three actions for one actor', async () => {
  const k = { actors: ['member:c5555555-5555-4555-8555-555555555555'], lives: ['youtube:TWENTY0SES1'] }
  await scenario(k, async () => {
    one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
    const sessions = []
    try {
      for (let index = 0; index < 20; index += 1) sessions.push(await openSqlSession())
      const startEpoch = (await sql("select extract(epoch from clock_timestamp()+interval '500 milliseconds')")).trim()
      const reactions = ['prayer', 'fire', 'heart', 'praise', 'kingdom']
      const calls = sessions.map((session, index) => session.sql(`select pg_sleep(greatest(0,extract(epoch from (to_timestamp(${startEpoch})-clock_timestamp())))); select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','${reactions[index % reactions.length]}',${deadline})`))
      const results = (await Promise.all(calls)).map(one)
      assert.equal(results.filter((result) => result.accepted).length, 3)
      assert.equal(results.filter((result) => !result.accepted && result.reason === 'rate_limited').length, 17)
      assert.equal((await sql(`select cardinality(accepted_at) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim(), '3')
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '3')
      assert.equal((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}' and actor_key='${k.actors[0]}'`)).trim(), '3')
    } finally {
      await task3CloseSessions(...sessions.reverse())
    }
  })
})

test('post-lock database time rejects a validation deadline that expires while waiting', async () => {
  const k = { actors: ['member:c6666666-6666-4666-8666-666666666666'], lives: ['youtube:LOCK666TIME'] }
  await scenario(k, async () => {
    one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
    await sql(`insert into public.live_reaction_actor_limits(actor_key) values ('${k.actors[0]}')`)
    let controller
    let contender
    let observer
    try {
      controller = await openSqlSession()
      contender = await openSqlSession()
      observer = await openSqlSession()
      const held = controller.sql(`set local application_name='live4b_postlock_controller'; select 1 from public.live_reaction_actor_limits where actor_key='${k.actors[0]}' for update; select pg_sleep(0.55)`)
      await task3WaitForActivity(observer, ['live4b_postlock_controller'], "wait_event='PgSleep'", 'post-lock controller')
      const attempt = contender.sql(`set local application_name='live4b_postlock_contender'; select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','fire',clock_timestamp()+interval '150 milliseconds')`)
      const settled = attempt.then((value) => ({ value }), (error) => ({ error }))
      await task3WaitForActivity(observer, ['live4b_postlock_contender'], "wait_event_type='Lock'", 'post-lock contender', { timeoutMs: 350 })
      await held
      const outcome = await settled
      assert.ok(outcome.error)
      assert.match(String(outcome.error), /validation_expired/i)
      assert.equal((await sql(`select cardinality(accepted_at) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim(), '0')
      assert.equal((await sql(`select count(*) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim(), '0')
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '0')
    } finally {
      await task3CloseSessions(observer, contender, controller)
    }
  })
})

test('finalize waits for an admitted transaction then freezes and reuses exact final stats', async () => {
  const k = {
    actors: [
      'member:c7777777-7777-4777-8777-777777777771',
      'member:c7777777-7777-4777-8777-777777777772',
    ],
    lives: ['youtube:FIN777ALS88'],
  }
  await scenario(k, async () => {
    one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
    let admission
    let finalizer
    let observer
    try {
      admission = await openSqlSession()
      finalizer = await openSqlSession()
      observer = await openSqlSession()
      const pendingAdmission = admission.sql(`set local application_name='live4b_finalize_admission'; select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','kingdom',${deadline}); select pg_sleep(0.6)`)
      await task3WaitForActivity(observer, ['live4b_finalize_admission'], "wait_event='PgSleep'", 'held accepted transaction')
      const pendingFinalize = finalizer.sql(`set local application_name='live4b_finalize_waiter'; select public.live_reaction_finalize('${k.lives[0]}')`)
      await task3WaitForActivity(observer, ['live4b_finalize_waiter'], "wait_event_type='Lock'", 'finalize waiting on run', { timeoutMs: 450 })
      assert.equal(one(await pendingAdmission).accepted, true)
      const first = one(await pendingFinalize)
      assert.equal(first.state, 'final')
      assert.deepEqual([first.stats.uniqueActors, first.stats.totalActions, first.stats.uniqueByType.kingdom, first.stats.actionsByType.kingdom], [1, 1, 1, 1])
      assert.deepEqual(Object.keys(first.stats).sort(), ['actionsByType', 'totalActions', 'uniqueActors', 'uniqueByType'])
      const frozenBefore = (await sql(`select closed_at::text || '|' || final_stats::text from public.live_reaction_runs where live_key='${k.lives[0]}'`)).trim()
      const eventsBefore = (await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim()
      const totalsBefore = (await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim()
      const second = one(await sql(`select public.live_reaction_finalize('${k.lives[0]}')`))
      assert.deepEqual(second, first)
      assert.equal((await sql(`select closed_at::text || '|' || final_stats::text from public.live_reaction_runs where live_key='${k.lives[0]}'`)).trim(), frozenBefore)
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), eventsBefore)
      assert.equal((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim(), totalsBefore)
      const closedAttempt = one(await record(k.lives[0], k.actors[1], 'fire'))
      assert.deepEqual(closedAttempt, { accepted: false, reason: 'closed' })
      assert.equal((await sql(`select count(*) from public.live_reaction_actor_limits where actor_key='${k.actors[1]}'`)).trim(), '0')
      const snapA = one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
      const snapB = one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
      assert.equal(snapA.state, 'closed')
      assert.deepEqual(snapA.stats, first.stats)
      assert.deepEqual(snapB.stats, first.stats)
    } finally {
      await task3CloseSessions(observer, finalizer, admission)
    }
  })
})

test('a record blocked behind an exclusive finalize transaction observes closed after release', async () => {
  const k = { actors: ['member:c8888888-8888-4888-8888-888888888888'], lives: ['youtube:CLOSE88RUN9'] }
  await scenario(k, async () => {
    one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`))
    let finalizer
    let contender
    let observer
    try {
      finalizer = await openSqlSession()
      contender = await openSqlSession()
      observer = await openSqlSession()
      const heldFinalize = finalizer.sql(`set local application_name='live4b_close_controller'; select public.live_reaction_finalize('${k.lives[0]}'); select pg_sleep(0.55)`)
      await task3WaitForActivity(observer, ['live4b_close_controller'], "wait_event='PgSleep'", 'exclusive finalize lock')
      const pendingRecord = contender.sql(`set local application_name='live4b_close_contender'; select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','fire',${deadline})`)
      await task3WaitForActivity(observer, ['live4b_close_contender'], "wait_event_type='Lock'", 'record waiting behind finalize', { timeoutMs: 350 })
      await heldFinalize
      assert.deepEqual(one(await pendingRecord), { accepted: false, reason: 'closed' })
      assert.equal((await sql(`select count(*) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim(), '0')
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '0')
    } finally {
      await task3CloseSessions(observer, contender, finalizer)
    }
  })
})

test('concurrent finalizers return identical frozen JSON', async () => {
  const k = { actors: ['member:c9999999-9999-4999-8999-999999999999'], lives: ['youtube:IDEM999FIN0'] }
  await scenario(k, async () => {
    assert.equal(one(await record(k.lives[0], k.actors[0], 'heart')).accepted, true)
    const sessions = [await openSqlSession(), await openSqlSession()]
    try {
      const startEpoch = (await sql("select extract(epoch from clock_timestamp()+interval '350 milliseconds')")).trim()
      const calls = sessions.map((session, index) => session.sql(`set local application_name='live4b_finalizer_${index}'; select pg_sleep(greatest(0,extract(epoch from (to_timestamp(${startEpoch})-clock_timestamp())))); select public.live_reaction_finalize('${k.lives[0]}')`))
      const results = (await Promise.all(calls)).map(one)
      assert.equal(results.length, 2)
      assert.deepEqual(results[0], results[1])
      assert.equal(results[0].state, 'final')
      assert.equal(results[0].stats.totalActions, 1)
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '1')
      assert.equal((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim(), '1')
    } finally {
      await task3CloseSessions(...sessions.reverse())
    }
  })
})

test('event insert and final snapshot update failures roll back partial state', async () => {
  const k = {
    actors: [
      'member:ca111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      'member:ca111111-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    ],
    lives: ['youtube:FAIL111EVT2', 'youtube:FAIL333FIN4'],
  }
  const eventFunction = 'live4b_test_fail_event_insert'
  const eventTrigger = 'live4b_test_fail_event_insert_trigger'
  const finalizeFunction = 'live4b_test_fail_finalize_update'
  const finalizeTrigger = 'live4b_test_fail_finalize_update_trigger'
  await scenario(k, async () => {
    try {
      await sql(`create or replace function public.${eventFunction}() returns trigger language plpgsql as $$ begin if new.live_key='${k.lives[0]}' then raise exception 'forced_event_failure'; end if; return new; end $$; create trigger ${eventTrigger} before insert on public.live_reaction_events for each row execute function public.${eventFunction}()`)
      await assert.rejects(() => record(k.lives[0], k.actors[0], 'fire'), /forced_event_failure/i)
      assert.equal((await sql(`select count(*) from public.live_reaction_runs where live_key='${k.lives[0]}'`)).trim(), '0')
      assert.equal((await sql(`select count(*) from public.live_reaction_actor_limits where actor_key='${k.actors[0]}'`)).trim(), '0')
      assert.equal((await sql(`select count(*) from public.live_reaction_actor_totals where live_key='${k.lives[0]}'`)).trim(), '0')
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`)).trim(), '0')
    } finally {
      await sql(`drop trigger if exists ${eventTrigger} on public.live_reaction_events; drop function if exists public.${eventFunction}()`)
    }

    assert.equal(one(await record(k.lives[1], k.actors[1], 'prayer')).accepted, true)
    const totalsBefore = (await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[1]}'`)).trim()
    const eventsBefore = (await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[1]}'`)).trim()
    try {
      await sql(`create or replace function public.${finalizeFunction}() returns trigger language plpgsql as $$ begin if new.live_key='${k.lives[1]}' and new.closed_at is not null then raise exception 'forced_finalize_failure'; end if; return new; end $$; create trigger ${finalizeTrigger} before update on public.live_reaction_runs for each row execute function public.${finalizeFunction}()`)
      await assert.rejects(() => sql(`select public.live_reaction_finalize('${k.lives[1]}')`), /forced_finalize_failure/i)
      assert.equal((await sql(`select (closed_at is null and final_stats is null)::text from public.live_reaction_runs where live_key='${k.lives[1]}'`)).trim(), 'true')
      assert.equal((await sql(`select coalesce(sum(actions),0) from public.live_reaction_actor_totals where live_key='${k.lives[1]}'`)).trim(), totalsBefore)
      assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[1]}'`)).trim(), eventsBefore)
    } finally {
      await sql(`drop trigger if exists ${finalizeTrigger} on public.live_reaction_runs; drop function if exists public.${finalizeFunction}()`)
    }
  })
})

test('actual PostgreSQL privileges keep runtime functions and private state server-only', async () => {
  const k = { actors: ['member:cb111111-bbbb-4bbb-8bbb-bbbbbbbbbbbb'], lives: ['youtube:ACL111TEST2'] }
  await scenario(k, async () => {
    const signatures = [
      'public.live_reaction_window(timestamptz[],timestamptz)',
      'public.live_reaction_record(text,text,text,timestamptz)',
      'public.live_reaction_snapshot(text)',
      'public.live_reaction_admin_counts(text)',
      'public.live_reaction_finalize(text)',
    ]
    const privateTables = ['live_reaction_runs', 'live_reaction_actor_limits', 'live_reaction_actor_totals']
    const pgBool = (output) => {
      assert.ok(output.trim() === 't' || output.trim() === 'f')
      return output.trim() === 't'
    }

    for (const role of ['anon', 'authenticated']) {
      for (const signature of signatures) assert.equal(pgBool(await sql(`select has_function_privilege('${role}','${signature}','EXECUTE')`)), false)
      for (const table of privateTables) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
          assert.equal(pgBool(await sql(`select has_table_privilege('${role}','public.${table}','${privilege}')`)), false)
        }
      }
      assert.equal(pgBool(await sql(`select has_table_privilege('${role}','public.live_reaction_events','SELECT')`)), true)
      for (const privilege of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
        assert.equal(pgBool(await sql(`select has_table_privilege('${role}','public.live_reaction_events','${privilege}')`)), false)
      }
    }

    for (const signature of signatures) assert.equal(pgBool(await sql(`select has_function_privilege('service_role','${signature}','EXECUTE')`)), true)
    for (const table of privateTables) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE']) assert.equal(pgBool(await sql(`select has_table_privilege('service_role','public.${table}','${privilege}')`)), true)
      for (const privilege of ['DELETE', 'TRUNCATE']) assert.equal(pgBool(await sql(`select has_table_privilege('service_role','public.${table}','${privilege}')`)), false)
    }
    assert.equal(pgBool(await sql("select has_table_privilege('service_role','public.live_reaction_events','SELECT')")), true)
    assert.equal(pgBool(await sql("select has_table_privilege('service_role','public.live_reaction_events','INSERT')")), true)
    assert.equal(pgBool(await sql("select has_table_privilege('service_role','public.live_reaction_events','UPDATE')")), false)
    assert.equal(pgBool(await sql("select has_table_privilege('service_role','public.live_reaction_events','DELETE')")), false)
    assert.equal(pgBool(await sql("select has_table_privilege('service_role','public.live_reaction_events','TRUNCATE')")), false)

    await assert.rejects(() => sql(`select public.live_reaction_snapshot('${k.lives[0]}')`, { role: 'anon' }))
    await assert.rejects(() => sql('select count(*) from public.live_reaction_actor_limits', { role: 'authenticated' }))
    const serviceSnapshot = one(await sql(`select public.live_reaction_snapshot('${k.lives[0]}')`, { role: 'service_role' }))
    assert.equal(serviceSnapshot.state, 'open')
    assert.equal(one(await sql(`select public.live_reaction_record('${k.lives[0]}','${k.actors[0]}','fire',${deadline})`, { role: 'service_role' })).accepted, true)
    assert.equal((await sql(`select count(*) from public.live_reaction_events where live_key='${k.lives[0]}'`, { role: 'anon' })).trim(), '1')
    await assert.rejects(() => sql(`insert into public.live_reaction_events(live_key,reaction) values ('${k.lives[0]}','fire')`, { role: 'anon' }))
  })
})

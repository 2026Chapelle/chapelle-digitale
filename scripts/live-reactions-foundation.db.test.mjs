import assert from 'node:assert/strict'
import test from 'node:test'
import { openSqlSession, sql } from './live-reactions-db-harness.mjs'

const liveKey = 'youtube:abcdefghijk'
const memberKey = 'member:123e4567-e89b-12d3-a456-426614174000'
const guestKey = `guest:${'a'.repeat(64)}`

test('LIVE 4B.1 foundation rejects invalid domains and preserves anonymous event projection', async () => {
  const session = await openSqlSession()

  try {
    await assert.rejects(
      sql(`insert into public.live_reaction_runs (live_key) values ('youtube:not-valid')`),
    /psql failed/,
    )

    await session.sql(`insert into public.live_reaction_runs (live_key) values ('${liveKey}')`)

    await assert.rejects(
      sql(`insert into public.live_reaction_actor_limits (actor_key) values ('guest:invalid')`),
      /psql failed/,
    )

    await assert.rejects(
      sql(`insert into public.live_reaction_actor_totals (live_key, actor_key, reaction, actions, first_at, last_at) values ('${liveKey}', '${memberKey}', 'sparkle', 1, clock_timestamp(), clock_timestamp())`),
      /psql failed/,
    )

    await session.sql(`insert into public.live_reaction_actor_limits (actor_key, accepted_at) values ('${guestKey}', array[clock_timestamp(), clock_timestamp()])`)
    await session.sql(`insert into public.live_reaction_events (live_key, reaction) values ('${liveKey}', 'fire')`)

    const columns = await session.sql(`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'live_reaction_events' order by ordinal_position`)
    assert.equal(columns.trim(), 'event_id\nlive_key\nreaction\naccepted_at')
  } finally {
    await session.close()
  }
})

test('LIVE 4B.1 foundation denies browser writes and limits public reads to recent events', async () => {
  await assert.rejects(
    sql(`insert into public.live_reaction_events (live_key, reaction) values ('${liveKey}', 'fire')`, { role: 'anon' }),
    /psql failed/,
  )
  await assert.rejects(
    sql(`select * from public.live_reaction_actor_limits`, { role: 'authenticated' }),
    /psql failed/,
  )
  await sql(`select event_id from public.live_reaction_events`, { role: 'anon' })
})

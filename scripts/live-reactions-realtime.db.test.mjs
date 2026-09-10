import assert from 'node:assert/strict'
import test from 'node:test'

/* TASK14_LOCAL_DOCKER_PSQL_V1 */
import { spawn } from 'node:child_process'

const task14LocalMode =
  () =>
    process.env.LIVE4B_TEST_TARGET_MODE ===
    'local'

const task14DbContainer =
  () =>
    process.env.LIVE4B_TEST_DB_CONTAINER ||
    'supabase_db_live4b9-task14-supabase'

function dockerPsql(
  input,
) {
  return new Promise(
    (resolvePromise, reject) => {
      const child =
        spawn(
          'docker',
          [
            'exec',
            '-i',
            task14DbContainer(),
            'psql',
            '-X',
            '-qAt',
            '-v',
            'ON_ERROR_STOP=1',
            '-U',
            'postgres',
            '-d',
            'postgres',
          ],
          {
            stdio: [
              'pipe',
              'pipe',
              'pipe',
            ],
          },
        )

      let stdout = ''
      let stderr = ''

      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')

      child.stdout.on(
        'data',
        chunk => {
          stdout += chunk
        },
      )

      child.stderr.on(
        'data',
        chunk => {
          stderr += chunk
        },
      )

      child.on(
        'error',
        () => {
          reject(
            new Error(
              'docker psql could not start',
            ),
          )
        },
      )

      child.on(
        'close',
        code => {
          if (code === 0) {
            resolvePromise(stdout)
          } else {
            reject(
              new Error(
                'docker psql failed: ' +
                stderr.trim(),
              ),
            )
          }
        },
      )

      child.stdin.end(input)
    },
  )
}

async function sql(
  text,
  options = {},
) {
  if (!task14LocalMode()) {
    return harnessSql(
      text,
      options,
    )
  }

  const role =
    options.role

  const roleSql =
    role
      ? 'set local role ' +
        role +
        '; '
      : ''

  const statement =
    String(text).trimEnd()

  const terminated =
    statement.endsWith(';')
      ? statement
      : statement + ';'

  return dockerPsql(
    'begin; ' +
      roleSql +
      terminated +
      '\ncommit;\n',
  )
}

async function openSqlSession() {
  if (!task14LocalMode()) {
    return harnessOpenSqlSession()
  }

  const child =
    spawn(
      'docker',
      [
        'exec',
        '-i',
        task14DbContainer(),
        'psql',
        '-X',
        '-qAt',
        '-v',
        'ON_ERROR_STOP=1',
        '-U',
        'postgres',
        '-d',
        'postgres',
      ],
      {
        stdio: [
          'pipe',
          'pipe',
          'pipe',
        ],
      },
    )

  let stdout = ''
  let stderr = ''
  let serial = 0
  let pending = null
  let closed = false

  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')

  child.stdout.on(
    'data',
    chunk => {
      stdout += chunk

      if (!pending) return

      const index =
        stdout.indexOf(
          pending.marker,
          pending.start,
        )

      if (index === -1) return

      const current = pending
      pending = null

      current.resolve(
        stdout.slice(
          current.start,
          index,
        ),
      )
    },
  )

  child.stderr.on(
    'data',
    chunk => {
      stderr += chunk
    },
  )

  child.on(
    'error',
    () => {
      if (pending) {
        pending.reject(
          new Error(
            'docker psql session could not start',
          ),
        )
        pending = null
      }
    },
  )

  child.on(
    'close',
    code => {
      closed = true

      if (pending) {
        pending.reject(
          new Error(
            'docker psql session ended ' +
            code +
            ': ' +
            stderr.trim(),
          ),
        )
        pending = null
      }
    },
  )

  return {
    sql(
      text,
      { role } = {},
    ) {
      if (closed) {
        return Promise.reject(
          new Error(
            'docker psql session closed',
          ),
        )
      }

      if (pending) {
        return Promise.reject(
          new Error(
            'docker psql session busy',
          ),
        )
      }

      const marker =
        '__task14_sql_' +
        (++serial) +
        '__'

      const start =
        stdout.length

      const roleSql =
        role
          ? 'set local role ' +
            role +
            '; '
          : ''

      const statement =
        String(text).trimEnd()

      const terminated =
        statement.endsWith(';')
          ? statement
          : statement + ';'

      /*
       * Important:
       * do NOT frame BEGIN/ROLLBACK in another transaction.
       * This persistent psql process is exactly what the
       * rollback test requires.
       */
      const framed =
        roleSql +
        terminated +
        '\n\\echo ' +
        marker +
        '\n'

      return new Promise(
        (resolvePromise, reject) => {
          pending = {
            marker,
            start,
            resolve: resolvePromise,
            reject,
          }

          child.stdin.write(framed)
        },
      )
    },

    async close() {
      if (closed) return

      child.stdin.end()

      await new Promise(
        resolvePromise =>
          child.once(
            'close',
            resolvePromise,
          ),
      )
    },
  }
}


import {
  createClient,
} from '@supabase/supabase-js'

import {
  openSqlSession as harnessOpenSqlSession,
  sql as harnessSql,
} from './live-reactions-db-harness.mjs'

import {
  validateLoadTarget,
} from './live-reactions-load.mjs'

const PRODUCTION_REF =
  'nvyuyffywnuollaxguen'

const PRIVATE_TABLES = [
  'live_reaction_runs',
  'live_reaction_actor_limits',
  'live_reaction_actor_totals',
]

const RUNTIME_FUNCTIONS = [
  {
    name: 'live_reaction_window',
    args: {
      p_times: [],
      p_time:
        new Date().toISOString(),
    },
  },
  {
    name: 'live_reaction_record',
    args: {
      p_live_key:
        'youtube:AAA111BBB22',
      p_actor_key:
        'guest:' + 'a'.repeat(64),
      p_reaction:
        'fire',
      p_validation_expires_at:
        new Date(
          Date.now() + 60_000,
        ).toISOString(),
    },
  },
  {
    name:
      'live_reaction_snapshot',
    args: {
      p_live_key:
        'youtube:AAA111BBB22',
    },
  },
  {
    name:
      'live_reaction_admin_counts',
    args: {
      p_live_key:
        'youtube:AAA111BBB22',
    },
  },
  {
    name:
      'live_reaction_finalize',
    args: {
      p_live_key:
        'youtube:AAA111BBB22',
    },
  },
]

const SCHEMA_PRIMITIVES = [
  {
    name:
      'live_reaction_stats_valid',
    args: {
      value: {},
    },
  },
  {
    name:
      'live_reaction_times_valid',
    args: {
      value: [],
    },
  },
]

function env(name) {
  const value =
    process.env[name]

  if (
    typeof value !== 'string' ||
    value.trim() === ''
  ) {
    throw new Error(
      `BLOCKED: missing ${name}`,
    )
  }

  return value.trim()
}

function authorizedEnvironment() {
  const go =
    env('GO_LIVE4B_LOAD_TEST')

  if (go !== '1') {
    throw new Error(
      'BLOCKED: GO_LIVE4B_LOAD_TEST must equal 1',
    )
  }

  const projectRef =
    env('LIVE4B_TEST_PROJECT_REF')

  const appUrl =
    env('LIVE4B_TEST_APP_URL')

  const supabaseUrl =
    env('LIVE4B_TEST_SUPABASE_URL')

  const anonKey =
    env(
      'LIVE4B_TEST_SUPABASE_ANON_KEY',
    )

  const memberEmail =
    env('LIVE4B_TEST_MEMBER_EMAIL')

  const memberPassword =
    env('LIVE4B_TEST_MEMBER_PASSWORD')

  const dbUrl =
    env('LIVE4B_TEST_DB_URL')

  validateLoadTarget({
    go: true,
    /* TASK14_REALTIME_TARGET_MODE_V1 */
    targetMode:
      process.env.LIVE4B_TEST_TARGET_MODE ===
      'local'
        ? 'local'
        : 'remote',
    projectRef,
    expectedProjectRef:
      projectRef,
    appUrl,
    supabaseUrl,
    scenario: 'low',
  })

  if (
    projectRef ===
    PRODUCTION_REF
  ) {
    throw new Error(
      'BLOCKED: production project forbidden',
    )
  }

  process.env
    .LIVE_REACTIONS_TEST_DATABASE_URL =
      dbUrl

  return {
    projectRef,
    appUrl:
      new URL(appUrl).origin,
    supabaseUrl:
      new URL(supabaseUrl).origin,
    anonKey,
    memberEmail,
    memberPassword,
  }
}

const config =
  authorizedEnvironment()

function anonClient() {
  return createClient(
    config.supabaseUrl,
    config.anonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}

async function authenticatedClient() {
  const client =
    anonClient()

  const {
    data,
    error,
  } =
    await client.auth
      .signInWithPassword({
        email:
          config.memberEmail,
        password:
          config.memberPassword,
      })

  assert.ifError(error)

  assert.ok(
    data.session?.access_token,
    'authenticated test session required',
  )

  return client
}

async function canonicalLiveKey() {
  const response =
    await fetch(
      `${config.appUrl}/api/live/canonical`,
      {
        method: 'GET',
        headers: {
          accept:
            'application/json',
        },
      },
    )

  assert.equal(
    response.ok,
    true,
    'test canonical endpoint must be healthy',
  )

  const body =
    await response.json()

  /* TASK14_CANONICAL_STATE_ENVELOPE_V1 */
  const canonicalState = body.state ?? body

  assert.equal(
    canonicalState.status,
    'LIVE',
    'test target must expose a currently LIVE canonical video',
  )

  assert.match(
    canonicalState.youtubeVideoId,
    /^[A-Za-z0-9_-]{11}$/,
  )

  return (
    `youtube:${canonicalState.youtubeVideoId}`
  )
}

async function expectForbidden(
  promise,
  label,
) {
  const {
    error,
  } =
    await promise

  assert.ok(
    error,
    `${label} unexpectedly succeeded`,
  )
}

async function subscribe(
  client,
  liveKey,
  events,
) {
  const channel =
    client
      .channel(
        `live4b-task14-${
          crypto.randomUUID()
        }`,
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table:
            'live_reaction_events',
          filter:
            `live_key=eq.${liveKey}`,
        },
        payload => {
          events.push(
            payload.new,
          )
        },
      )

  await new Promise(
    (resolve, reject) => {
      const timeout =
        setTimeout(
          () =>
            reject(
              new Error(
                'Realtime subscription timeout',
              ),
            ),
          10_000,
        )

      channel.subscribe(
        status => {
          if (
            status ===
            'SUBSCRIBED'
          ) {
            clearTimeout(timeout)
            resolve()
          }

          if (
            status ===
              'CHANNEL_ERROR' ||
            status ===
              'TIMED_OUT'
          ) {
            clearTimeout(timeout)
            reject(
              new Error(
                `Realtime status ${status}`,
              ),
            )
          }
        },
      )
    },
  )

  return channel
}

function waitFor(
  predicate,
  timeoutMs = 5_000,
) {
  return new Promise(
    (resolve, reject) => {
      const started =
        Date.now()

      const timer =
        setInterval(
          () => {
            if (predicate()) {
              clearInterval(timer)
              resolve()
              return
            }

            if (
              Date.now() -
                started >=
              timeoutMs
            ) {
              clearInterval(timer)
              reject(
                new Error(
                  'condition timeout',
                ),
              )
            }
          },
          50,
        )
    },
  )
}

async function postGuestReaction(
  liveKey,
  reaction,
) {
  const guestSessionId =
    crypto.randomUUID()

  const response =
    await fetch(
      `${config.appUrl}/api/live/reactions`,
      {
        method: 'POST',
        headers: {
          accept:
            'application/json',
          'content-type':
            'application/json',
          origin:
            config.appUrl,
          'x-live-context':
            liveKey,
        },
        body:
          JSON.stringify({
            reaction,
            guestSessionId,
          }),
      },
    )

  const body =
    await response.json()

  assert.equal(
    response.ok,
    true,
    JSON.stringify(body),
  )

  assert.equal(
    body.ok,
    true,
  )

  return body
}

test(
  'anon and authenticated roles cannot read any private reaction table',
  async () => {
    const anon =
      anonClient()

    const member =
      await authenticatedClient()

    try {
      for (
        const client of
          [anon, member]
      ) {
        for (
          const table of
            PRIVATE_TABLES
        ) {
          await expectForbidden(
            client
              .from(table)
              .select('*')
              .limit(1),
            `SELECT ${table}`,
          )
        }
      }
    }
    finally {
      await member.auth.signOut()
    }
  },
)

test(
  'anon and authenticated roles cannot write any of the four reaction tables',
  async () => {
    const anon =
      anonClient()

    const member =
      await authenticatedClient()

    const tables = [
      ...PRIVATE_TABLES,
      'live_reaction_events',
    ]

    try {
      for (
        const client of
          [anon, member]
      ) {
        for (
          const table of tables
        ) {
          await expectForbidden(
            client
              .from(table)
              .insert({}),
            `INSERT ${table}`,
          )
        }
      }
    }
    finally {
      await member.auth.signOut()
    }
  },
)

test(
  'anon and authenticated roles cannot execute schema primitives or runtime functions',
  async () => {
    const anon =
      anonClient()

    const member =
      await authenticatedClient()

    const functions = [
      ...SCHEMA_PRIMITIVES,
      ...RUNTIME_FUNCTIONS,
    ]

    try {
      for (
        const client of
          [anon, member]
      ) {
        for (
          const entry of functions
        ) {
          await expectForbidden(
            client.rpc(
              entry.name,
              entry.args,
            ),
            `RPC ${entry.name}`,
          )
        }
      }
    }
    finally {
      await member.auth.signOut()
    }
  },
)

test(
  'public event projection exposes only the four sanitized recent columns',
  async () => {
    const client =
      anonClient()

    const {
      data,
      error,
    } =
      await client
        .from(
          'live_reaction_events',
        )
        .select(
          'event_id,live_key,reaction,accepted_at',
        )
        .limit(25)

    assert.ifError(error)
    assert.ok(
      Array.isArray(data),
    )

    for (const event of data) {
      assert.deepEqual(
        Object.keys(event)
          .sort(),
        [
          'accepted_at',
          'event_id',
          'live_key',
          'reaction',
        ],
      )

      assert.ok(
        Date.now() -
          Date.parse(
            event.accepted_at,
          ) <=
          61_000,
        'public projection leaked an event older than the recent-read window',
      )

      assert.equal(
        Object.hasOwn(
          event,
          'actor_key',
        ),
        false,
      )
    }
  },
)

test(
  'one committed API action reaches two real Realtime subscribers',
  async () => {
    const liveKey =
      await canonicalLiveKey()

    const clientA =
      anonClient()

    const clientB =
      anonClient()

    const eventsA = []
    const eventsB = []

    let channelA
    let channelB

    try {
      channelA =
        await subscribe(
          clientA,
          liveKey,
          eventsA,
        )

      channelB =
        await subscribe(
          clientB,
          liveKey,
          eventsB,
        )

      const result =
        await postGuestReaction(
          liveKey,
          'fire',
        )

      /* TASK14_FANOUT_DIAGNOSTIC_V1 */
      try {
        await waitFor(
          () =>
            eventsA.some(
              event =>
                event.event_id ===
                result.event.eventId,
            ) &&
            eventsB.some(
              event =>
                event.event_id ===
                result.event.eventId,
            ),
        )
      }
      catch (error) {
        const committedRows =
          (
            await sql(`
              select count(*)
              from public.live_reaction_events
              where event_id =
                '${result.event.eventId}'
            `)
          ).trim()

        console.error(
          JSON.stringify({
            diagnostic:
              'TASK14_FANOUT_TIMEOUT',
            eventId:
              result.event.eventId,
            committedRows:
              Number(committedRows),
            eventsACount:
              eventsA.length,
            eventsBCount:
              eventsB.length,
            eventsAIds:
              eventsA.map(
                event =>
                  event.event_id,
              ),
            eventsBIds:
              eventsB.map(
                event =>
                  event.event_id,
              ),
          }),
        )

        throw error
      }

      assert.equal(
        eventsA.filter(
          event =>
            event.event_id ===
            result.event.eventId,
        ).length,
        1,
      )

      assert.equal(
        eventsB.filter(
          event =>
            event.event_id ===
            result.event.eventId,
        ).length,
        1,
      )
    }
    finally {
      if (channelA) {
        await clientA
          .removeChannel(
            channelA,
          )
      }

      if (channelB) {
        await clientB
          .removeChannel(
            channelB,
          )
      }
    }
  },
)

test(
  'a rolled-back reaction transaction emits no Realtime event',
  async () => {
    const liveKey =
      await canonicalLiveKey()

    const client =
      anonClient()

    const events = []

    let channel
    let session

    const actor =
      `guest:${
        'b'.repeat(64)
      }`

    try {
      channel =
        await subscribe(
          client,
          liveKey,
          events,
        )

      session =
        await openSqlSession()

      await session.sql('begin')

      await session.sql(`
        select public.live_reaction_record(
          '${liveKey}',
          '${actor}',
          'heart',
          clock_timestamp() +
            interval '1 minute'
        )
      `)

      await session.sql(
        'rollback',
      )

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            1_000,
          ),
      )

      assert.equal(
        events.length,
        0,
        'rolled-back event reached Realtime',
      )
    }
    finally {
      try {
        await session?.sql(
          'rollback',
        )
      }
      catch {
      }

      await session?.close()

      if (channel) {
        await client
          .removeChannel(
            channel,
          )
      }
    }
  },
)

test(
  'Realtime reconnect changes no database totals by itself',
  async () => {
    const liveKey =
      await canonicalLiveKey()

    const before =
      JSON.parse(
        (
          await sql(
            `select public.live_reaction_snapshot('${liveKey}')`,
          )
        ).trim(),
      )

    const client =
      anonClient()

    let channel

    try {
      channel =
        await subscribe(
          client,
          liveKey,
          [],
        )

      await client
        .removeChannel(
          channel,
        )

      channel =
        await subscribe(
          client,
          liveKey,
          [],
        )

      const after =
        JSON.parse(
          (
            await sql(
              `select public.live_reaction_snapshot('${liveKey}')`,
            )
          ).trim(),
        )

      assert.deepEqual(
        after.stats,
        before.stats,
      )
    }
    finally {
      if (channel) {
        await client
          .removeChannel(
            channel,
          )
      }
    }
  },
)

test(
  'a forged Broadcast message is not treated as a postgres reaction event',
  async () => {
    const liveKey =
      await canonicalLiveKey()

    const client =
      anonClient()

    const postgresEvents = []

    let channel

    try {
      channel =
        await subscribe(
          client,
          liveKey,
          postgresEvents,
        )

      await channel.send({
        type: 'broadcast',
        event:
          'live-reaction',
        payload: {
          event_id:
            crypto.randomUUID(),
          live_key:
            liveKey,
          reaction:
            'kingdom',
          accepted_at:
            new Date()
              .toISOString(),
        },
      })

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            500,
          ),
      )

      assert.equal(
        postgresEvents.length,
        0,
        'Broadcast was confused with postgres INSERT delivery',
      )
    }
    finally {
      if (channel) {
        await client
          .removeChannel(
            channel,
          )
      }
    }
  },
)
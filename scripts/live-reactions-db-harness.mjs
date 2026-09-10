import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260908120000_live_shared_reactions_foundation.sql',
)

const runtimeMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260908123000_live_shared_reactions_runtime_functions.sql',
)

const productionProjectRef = 'nvyuyffywnuollaxguen'

export function validateTestDatabaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('LIVE reactions test database target is required')
  }

  let parsed

  try {
    parsed = new URL(value.trim())
  } catch {
    throw new Error('LIVE reactions test database target is invalid')
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('LIVE reactions test database target must use PostgreSQL')
  }

  const identityParts = [
    parsed.hostname,
    parsed.username,
    parsed.pathname,
    parsed.search,
  ]
  const identity = identityParts
    .map((part) => {
      try {
        return decodeURIComponent(part).toLowerCase()
      } catch {
        return part.toLowerCase()
      }
    })
    .join('\n')

  if (identity.includes(productionProjectRef)) {
    throw new Error('LIVE reactions test database target is not authorized')
  }

  if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsed.hostname.toLowerCase())) {
    throw new Error('LIVE reactions test database target must be local loopback')
  }

  return value.trim()
}

function databaseUrl() {
  const value = process.env.LIVE_REACTIONS_TEST_DATABASE_URL

  return validateTestDatabaseUrl(value)
}

function roleSql(role) {
  if (!role) return ''

  if (!['anon', 'authenticated', 'service_role'].includes(role)) {
    throw new Error('unsupported SQL role')
  }

  return `set local role ${role};`
}

export function frameSqlTransaction(text, { role, marker } = {}) {
  const statement = text.trimEnd()
  const terminated = statement.endsWith(';') ? statement : `${statement};`
  const markerSql = marker ? `\\echo ${marker}\n` : ''

  return `begin; ${roleSql(role)} ${terminated}\ncommit;\n${markerSql}`
}

function runPsql(args, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('psql', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', () => reject(new Error('psql could not start')))
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(stdout)
      } else {
        reject(new Error(`psql failed with exit code ${code}: ${stderr.trim()}`))
      }
    })
    child.stdin.end(input)
  })
}

export async function sql(text, { role } = {}) {
  return runPsql(
    ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', databaseUrl()],
    frameSqlTransaction(text, { role }),
  )
}

export async function openSqlSession() {
  const child = spawn(
    'psql',
    ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', databaseUrl()],
    { stdio: ['pipe', 'pipe', 'pipe'] },
  )
  let stdout = ''
  let stderr = ''
  let serial = 0
  let pending = null
  let closed = false

  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', (chunk) => {
    stdout += chunk

    if (!pending) return

    const markerIndex = stdout.indexOf(pending.marker, pending.start)
    if (markerIndex === -1) return

    const current = pending
    pending = null
    current.resolve(stdout.slice(current.start, markerIndex))
  })
  child.stderr.on('data', (chunk) => { stderr += chunk })
  child.on('error', () => {
    if (pending) {
      pending.reject(new Error('psql could not start'))
      pending = null
    }
  })
  child.on('close', (code) => {
    closed = true
    if (pending) {
      pending.reject(new Error(`psql session ended with exit code ${code}: ${stderr.trim()}`))
      pending = null
    }
  })

  return {
    sql(text, { role } = {}) {
      if (closed) {
        return Promise.reject(new Error('psql session is closed'))
      }

      if (pending) {
        return Promise.reject(new Error('psql session allows one query at a time'))
      }

      const marker = `__live_reactions_sql_${serial += 1}__`
      const start = stdout.length

      return new Promise((resolvePromise, reject) => {
        pending = { marker, start, resolve: resolvePromise, reject }
        child.stdin.write(frameSqlTransaction(text, { role, marker }))
      })
    },
    async close() {
      if (closed) return
      child.stdin.end()
      await new Promise((resolvePromise) => child.once('close', resolvePromise))
    },
  }
}

export async function applyFoundation() {
  if (!existsSync(migrationPath)) {
    throw new Error('LIVE 4B.1 migration file is missing')
  }

  return runPsql(
    ['-X', '-v', 'ON_ERROR_STOP=1', '-f', migrationPath, databaseUrl()],
    '',
  )
}

export async function applyRuntime() {
  if (!existsSync(runtimeMigrationPath)) {
    throw new Error('LIVE 4B.2 runtime migration file is missing')
  }

  return runPsql(
    ['-X', '-v', 'ON_ERROR_STOP=1', '-f', runtimeMigrationPath, databaseUrl()],
    '',
  )
}

const isMainModule = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))

if (isMainModule) {
  const command = process.argv[2]

  if (command === 'apply-foundation') {
    await applyFoundation()
  } else if (command === 'apply-runtime') {
    await applyRuntime()
  } else {
    throw new Error('usage: node scripts/live-reactions-db-harness.mjs apply-foundation|apply-runtime')
  }
}

#!/usr/bin/env node
/**
 * Lanceur d'environnement portable pour le harnais OFFLINE E2E (Lot 1.2).
 *
 * Problème résolu : Next charge TOUJOURS `.env.local` (valeurs de PRODUCTION) et
 * ses clés écrasent tout ce qu'on met dans process.env (règle @next/env). On ne
 * peut donc pas isoler la prod en pré-positionnant des variables.
 *
 * Solution NON INVASIVE (on ne touche JAMAIS `.env.local`) : on exploite la
 * précédence de Next. L'ordre de chargement est :
 *     .env.production.local  >  .env.local  >  .env.production  >  .env
 * On génère donc un `.env.production.local` TEMPORAIRE (gitignoré) à partir de
 * `.env.offline-e2e` : ses valeurs FACTICES gagnent sur `.env.local`. Le fichier
 * est supprimé automatiquement à la sortie (et au démarrage s'il traîne).
 *
 * Sécurité : garde-fou `assertOfflineE2ESafe` avant tout lancement ; refus
 * d'écraser un `.env.production.local` qui n'aurait pas été créé par nous.
 *
 * Usage : node scripts/offline-e2e/with-env.mjs <cmd> [args…]
 */
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const ENV_FILE = resolve(ROOT, '.env.offline-e2e')
const TEMP_ENV = resolve(ROOT, '.env.production.local')
const MARKER = '# OFFLINE-E2E TEMP — généré par scripts/offline-e2e/with-env.mjs, supprimé automatiquement'

/** Parse minimal d'un fichier .env (KEY=VALUE, # commentaires, pas d'expansion). */
function parseEnvFile(path) {
  const out = {}
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

/** Garde-fou (miroir autonome de src/lib/offline/e2e-guard.ts). */
function assertOfflineE2ESafe(env) {
  if (env.OFFLINE_E2E_MODE !== 'true') return
  const SIGNALS = ['nvyuyffywnuollaxguen', 'chapelleduroyaume.org', 'sb_secret_', 'sb_publishable_', 'production', 'prod-']
  const KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL']
  for (const key of KEYS) {
    const v = (env[key] || '').toLowerCase()
    const sig = SIGNALS.find((s) => v.includes(s))
    if (sig) throw new Error(`[offline-e2e] REFUS : signal de production « ${sig} » dans ${key}.`)
  }
  if (!/^https?:\/\/(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?(\/|$)/i.test(env.NEXT_PUBLIC_SITE_URL || '')) {
    throw new Error('[offline-e2e] REFUS : NEXT_PUBLIC_SITE_URL doit être local.')
  }
}

const parsed = parseEnvFile(ENV_FILE)

// 1) Garde-fou sur les valeurs FACTICES elles-mêmes.
try {
  assertOfflineE2ESafe(parsed)
} catch (err) {
  console.error(String(err?.message || err))
  process.exit(2)
}

// 2) Nettoie un éventuel temp résiduel (crash précédent), sans jamais écraser un
//    vrai fichier utilisateur.
function cleanupTemp() {
  try {
    if (existsSync(TEMP_ENV) && readFileSync(TEMP_ENV, 'utf8').startsWith(MARKER)) {
      unlinkSync(TEMP_ENV)
    }
  } catch {
    /* ignore */
  }
}
if (existsSync(TEMP_ENV) && !readFileSync(TEMP_ENV, 'utf8').startsWith(MARKER)) {
  console.error(
    `[offline-e2e] REFUS : ${TEMP_ENV} existe déjà et n'a pas été créé par le harnais. ` +
      `Supprime-le ou déplace-le avant de relancer (protection anti-écrasement).`,
  )
  process.exit(2)
}
cleanupTemp()

// 3) Écrit le temp `.env.production.local` (gagne sur .env.local de production).
const body =
  MARKER +
  '\n' +
  Object.entries(parsed)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') +
  '\n'
writeFileSync(TEMP_ENV, body, 'utf8')

// Restauration/nettoyage garanti.
process.on('exit', cleanupTemp)
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    cleanupTemp()
    process.exit(130)
  })
}
process.on('uncaughtException', (e) => {
  cleanupTemp()
  console.error(String(e?.message || e))
  process.exit(1)
})

// Renseigne aussi process.env (utile hors Next).
for (const [k, v] of Object.entries(parsed)) process.env[k] = v

const [, , cmd, ...args] = process.argv
if (!cmd) {
  console.error('Usage: node scripts/offline-e2e/with-env.mjs <cmd> [args…]')
  cleanupTemp()
  process.exit(2)
}

console.log(`[offline-e2e] .env.production.local temporaire écrit — lancement : ${cmd} ${args.join(' ')}`)

const child = spawn(cmd, args, {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: process.env,
})
child.on('exit', (code) => {
  cleanupTemp()
  process.exit(code ?? 0)
})
child.on('error', (err) => {
  cleanupTemp()
  console.error(String(err?.message || err))
  process.exit(1)
})

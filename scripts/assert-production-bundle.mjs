import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const AUTHORIZED_PROJECT_REF = 'nvyuyffywnuollaxguen'
const TEXT_ASSET_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.css', '.json', '.map', '.html', '.txt'])
const LOOPBACK_HOST = String.raw`(?:localhost(?:\.[a-z\d.-]+)?|127(?:\.\d{1,3}){1,3}|0\.0\.0\.0|\[?::1\]?|host\.docker\.internal|host\.containers\.internal)`
const LOOPBACK_URL = new RegExp(String.raw`(?:https?:)?//${LOOPBACK_HOST}(?::\d+)?(?:[/?#][^\s"'<>]*)?`, 'gi')
const LOCAL_AUTH_STORAGE_KEY = new RegExp(String.raw`\bsb-(?:localhost|127(?:\.\d{1,3}){0,3}|0\.0\.0\.0|::1|\[::1\])-auth-token\b`, 'gi')
const HOSTED_SUPABASE_URL = new RegExp(String.raw`https?://([a-z0-9-]+)\.supabase\.co(?=[:/?#"'\s]|$)`, 'gi')
const CONFIG_CONTEXT = /(?:supabase[_-]?url|next_public_supabase_url|createclient(?:componentclient|servercomponentclient|routehandlerclient)?|sb-[a-z0-9.-]+-auth-token|\/(?:auth|rest|storage|realtime|functions)\/v1)/i

function parseAssetsDir(argv) {
  const index = argv.indexOf('--assets-dir')
  if (index < 0) return path.resolve('.next/static')
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) return null
  return path.resolve(value)
}

function collectTextAssets(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...collectTextAssets(fullPath))
    else if (entry.isFile() && TEXT_ASSET_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(fullPath)
  }
  return files
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length
}

function hasSupabaseConfigContext(text, start, end) {
  return CONFIG_CONTEXT.test(text.slice(Math.max(0, start - 180), Math.min(text.length, end + 180)))
}

function isKnownGoTrueFallback(url, text, start, end) {
  if (!new RegExp(String.raw`^https?://localhost:9999/?$`, 'i').test(url)) return false
  const nearby = text.slice(Math.max(0, start - 100), Math.min(text.length, end + 100))
  // Supabase Auth's internal GoTrue default is inert unless passed as the
  // application's Supabase URL. A nearby explicit config marker makes it unsafe.
  return !CONFIG_CONTEXT.test(nearby)
}

const assetsDir = parseAssetsDir(process.argv.slice(2))
if (!assetsDir || !statExists(assetsDir)) {
  console.error('CITADELLE_PROD_BUNDLE_GUARD=FAIL')
  console.error('BROWSER_ASSETS=NOT_FOUND')
  process.exit(1)
}

const assets = collectTextAssets(assetsDir)
let rawLoopbackTextHits = 0
let dangerousLocalHits = 0
let productionHits = 0
let unauthorizedProjectHits = 0

for (const asset of assets) {
  // Normalize common JSON/JS escaping before scanning; never print asset contents.
  const text = readFileSync(asset, 'utf8').replaceAll('\\/', '/').replace(/\\u002f/gi, '/')
  rawLoopbackTextHits += countMatches(text, new RegExp(LOOPBACK_HOST, 'gi'))
  productionHits += countMatches(text, new RegExp(AUTHORIZED_PROJECT_REF, 'g'))

  for (const match of text.matchAll(new RegExp(LOOPBACK_URL.source, LOOPBACK_URL.flags))) {
    const url = match[0]
    const start = match.index ?? 0
    const end = start + url.length
    if (!isKnownGoTrueFallback(url, text, start, end) && hasSupabaseConfigContext(text, start, end)) {
      dangerousLocalHits += 1
    }
  }

  dangerousLocalHits += countMatches(text, new RegExp(LOCAL_AUTH_STORAGE_KEY.source, LOCAL_AUTH_STORAGE_KEY.flags))

  for (const match of text.matchAll(new RegExp(HOSTED_SUPABASE_URL.source, HOSTED_SUPABASE_URL.flags))) {
    if (match[1] === AUTHORIZED_PROJECT_REF) continue
    const start = match.index ?? 0
    const end = start + match[0].length
    if (hasSupabaseConfigContext(text, start, end)) unauthorizedProjectHits += 1
  }
}

const bundleValid = assets.length > 0 && dangerousLocalHits === 0 && unauthorizedProjectHits === 0 && productionHits > 0
console.log(`RAW_LOOPBACK_TEXT_HITS=${rawLoopbackTextHits}`)
console.log(`DANGEROUS_SUPABASE_LOCAL_HITS=${dangerousLocalHits}`)
console.log(`UNAUTHORIZED_SUPABASE_PROJECT_HITS=${unauthorizedProjectHits}`)
console.log(`PROD_PROJECT_ASSET_HITS=${productionHits}`)
console.log(`BROWSER_BUNDLE_LOCAL_SUPABASE=${dangerousLocalHits === 0 ? 'NO' : 'YES'}`)
console.log(`BROWSER_BUNDLE_PRODUCTION_SUPABASE=${productionHits > 0 ? 'YES' : 'NO'}`)
console.log(`BUNDLE_ENV_VALIDATION=${bundleValid ? 'PASS' : 'FAIL'}`)

if (!bundleValid) {
  console.error('CITADELLE_PROD_BUNDLE_GUARD=FAIL')
  if (assets.length === 0) console.error('BROWSER_ASSETS=EMPTY')
  process.exit(1)
}
console.log('CITADELLE_PROD_BUNDLE_GUARD=PASS')

function statExists(file) {
  try {
    return statSync(file).isDirectory()
  } catch {
    return false
  }
}

#!/usr/bin/env node
/**
 * CITADELLE — Vérification NON SENSIBLE du connecteur YouTube Live (à exécuter sur N0C ou en local).
 *
 *   node scripts/youtube-live-check.mjs            # lit les variables du process
 *   node scripts/youtube-live-check.mjs --env .env # charge un .env (à côté d'app.js) sans l'afficher
 *
 * Imprime UNIQUEMENT : des codes d'erreur (`youtube_*`), des identifiants publics de chaîne/vidéo,
 * des titres, des statuts et des horaires. Jamais de client_secret, refresh_token ni access_token.
 * Lecture seule : aucune mutation YouTube, Supabase, fichier ni configuration. Toute valeur secrète est
 * rédigée ([redacted]) avant impression, même en cas d'erreur inattendue.
 */
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const envIdx = args.indexOf('--env')
if (envIdx !== -1 && args[envIdx + 1]) {
  const file = path.resolve(process.cwd(), args[envIdx + 1])
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
    if (process.env[key] === undefined) process.env[key] = val
  }
}

const present = (name) => Boolean((process.env[name] ?? '').trim())
const report = { configured: { YOUTUBE_OAUTH_CLIENT_ID: present('YOUTUBE_OAUTH_CLIENT_ID'), YOUTUBE_OAUTH_CLIENT_SECRET: present('YOUTUBE_OAUTH_CLIENT_SECRET'), YOUTUBE_OAUTH_REFRESH_TOKEN: present('YOUTUBE_OAUTH_REFRESH_TOKEN'), YOUTUBE_CHANNEL_ID: present('YOUTUBE_CHANNEL_ID') } }
const SECRET_NAMES = ['YOUTUBE_OAUTH_CLIENT_ID', 'YOUTUBE_OAUTH_CLIENT_SECRET', 'YOUTUBE_OAUTH_REFRESH_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_SESSION_TOKEN', 'CRON_SECRET']
let issuedAccessToken = ''
/** Garde-fou : toute valeur secrète (env ou access_token émis) est remplacée avant impression. */
const redact = (text) => {
  let out = text
  for (const value of [...SECRET_NAMES.map((n) => (process.env[n] ?? '').trim()), issuedAccessToken].filter((v) => v.length >= 6)) {
    out = out.split(value).join('[redacted]')
  }
  return out
}
const print = (obj) => console.log(redact(JSON.stringify(obj, null, 2)))

if (!report.configured.YOUTUBE_OAUTH_CLIENT_ID || !report.configured.YOUTUBE_OAUTH_CLIENT_SECRET || !report.configured.YOUTUBE_OAUTH_REFRESH_TOKEN) {
  print({ ...report, error: 'youtube_oauth_not_configured' })
  process.exit(2)
}

async function token() {
  const body = new URLSearchParams({ client_id: process.env.YOUTUBE_OAUTH_CLIENT_ID.trim(), client_secret: process.env.YOUTUBE_OAUTH_CLIENT_SECRET.trim(), refresh_token: process.env.YOUTUBE_OAUTH_REFRESH_TOKEN.trim(), grant_type: 'refresh_token' })
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
  if (!res.ok) {
    let code = `youtube_oauth_http_${res.status}`
    try { const j = await res.json(); if (j?.error === 'invalid_grant') code = 'youtube_oauth_invalid_grant' } catch {}
    throw new Error(code)
  }
  const j = await res.json()
  issuedAccessToken = typeof j.access_token === 'string' ? j.access_token : ''
  return { accessToken: issuedAccessToken, scope: typeof j.scope === 'string' ? j.scope.split(' ') : [] }
}

async function api(accessToken, resource, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`)
  url.search = new URLSearchParams(params).toString()
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`youtube_${resource}_${res.status}`)
  return (await res.json()).items || []
}

const safeBroadcast = (b) => ({ videoId: b.id, title: b.snippet?.title, channelId: b.snippet?.channelId, lifeCycleStatus: b.status?.lifeCycleStatus, privacyStatus: b.status?.privacyStatus, scheduledStartTime: b.snippet?.scheduledStartTime, actualStartTime: b.snippet?.actualStartTime, actualEndTime: b.snippet?.actualEndTime })

try {
  const { accessToken, scope } = await token()
  report.scopes = scope
  const channels = await api(accessToken, 'channels', { part: 'id,snippet', mine: 'true' })
  report.authorizedChannel = channels[0] ? { channelId: channels[0].id, title: channels[0].snippet?.title, handle: channels[0].snippet?.customUrl } : null
  report.channelIdMatches = present('YOUTUBE_CHANNEL_ID') ? channels.some((c) => c.id === process.env.YOUTUBE_CHANNEL_ID.trim()) : 'YOUTUBE_CHANNEL_ID non défini (optionnel)'
  for (const status of ['active', 'upcoming']) {
    report[status] = (await api(accessToken, 'liveBroadcasts', { part: 'id,snippet,status', broadcastStatus: status, broadcastType: 'all', maxResults: '10' })).map(safeBroadcast)
  }
  report.recentCompleted = (await api(accessToken, 'liveBroadcasts', { part: 'id,snippet,status', broadcastStatus: 'completed', broadcastType: 'all', maxResults: '5' })).map(safeBroadcast)
  report.verdict = report.active.length ? 'LIVE détecté' : report.upcoming.length ? 'UPCOMING détecté' : 'OFFLINE (aucune diffusion active ou programmée visible par ce compte)'
  print(report)
} catch (err) {
  const message = err instanceof Error ? err.message : ''
  print({ ...report, error: /^youtube_[a-z0-9_]+$/.test(message) ? message : 'youtube_live_error' })
  process.exit(1)
}
process.on('uncaughtException', () => { console.error(redact('Erreur inattendue (détails masqués).')); process.exit(1) })

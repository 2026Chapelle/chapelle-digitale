const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const missing = required.filter((name) => !process.env[name] || process.env[name].includes('placeholder'))

const replayGuestSecret = process.env.LIVE_REPLAY_GUEST_SECRET
const replayGuestSecretInvalid =
  !replayGuestSecret ||
  replayGuestSecret.includes('placeholder') ||
  replayGuestSecret.length < 32

if (replayGuestSecretInvalid) missing.push('LIVE_REPLAY_GUEST_SECRET')

if (process.env.NODE_ENV === 'production' && missing.length) {
  console.error('CITADELLE_PROD_ENV_GUARD=FAIL')
  console.error(`MISSING=${missing.join(',')}`)
  process.exit(1)
}
console.log('CITADELLE_PROD_ENV_GUARD=PASS')

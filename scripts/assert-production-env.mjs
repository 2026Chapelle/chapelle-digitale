import { isIP } from 'node:net'

const AUTHORIZED_PROJECT_REF = 'nvyuyffywnuollaxguen'
const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
const PLACEHOLDER = /(?:^|[._\s-])(?:placeholder|changeme|change-me|your|example|sample|dummy|replace|insert|todo|test)(?:[._\s-]|$)/i

function ipv4IsLocal(host) {
  const octets = host.split('.').map(Number)
  return octets.length === 4 && (octets[0] === 127 || octets.every((part) => part === 0))
}

function ipv6Words(host) {
  let address = host.toLowerCase()
  const dotted = address.match(/(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (dotted) {
    if (!ipv4IsValid(dotted[1])) return []
    const [a, b, c, d] = dotted[1].split('.').map(Number)
    address = address.slice(0, -dotted[1].length) + `${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`
  }

  const halves = address.split('::')
  if (halves.length > 2) return []
  const left = halves[0] ? halves[0].split(':') : []
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  const missing = 8 - left.length - right.length
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return []
  const words = [...left, ...Array(missing).fill('0'), ...right].map((part) => Number.parseInt(part || '0', 16))
  return words.length === 8 && words.every((word) => Number.isInteger(word) && word >= 0 && word <= 0xffff) ? words : []
}

function ipv4IsValid(host) {
  const parts = host.split('.')
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

function isLocalHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'ip6-localhost' ||
    host === 'ip6-loopback' ||
    host === 'host.docker.internal' ||
    host === 'host.containers.internal'
  ) return true

  const ipVersion = isIP(host)
  if (ipVersion === 4) return ipv4IsLocal(host)
  if (ipVersion !== 6) return false

  const words = ipv6Words(host)
  if (!words.length) return true
  if (words.every((word) => word === 0)) return true // unspecified address
  if (words.slice(0, 7).every((word) => word === 0) && words[7] === 1) return true // ::1

  // IPv4-mapped/compatible IPv6 addresses must not hide a local IPv4 target.
  const mapped = words.slice(0, 5).every((word) => word === 0) && words[5] === 0xffff
  const compatible = words.slice(0, 6).every((word) => word === 0)
  if (mapped || compatible) {
    const ipv4 = `${words[6] >> 8}.${words[6] & 255}.${words[7] >> 8}.${words[7] & 255}`
    return ipv4IsLocal(ipv4)
  }
  return false
}

function validateProductionEnvironment(env) {
  const problems = []
  const missing = REQUIRED.filter((name) => !env[name]?.trim())
  if (missing.length) problems.push(`MISSING=${missing.join(',')}`)

  const rawUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (rawUrl) {
    let url
    try {
      url = new URL(rawUrl)
    } catch {
      problems.push('INVALID=NEXT_PUBLIC_SUPABASE_URL')
    }
    if (url) {
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.port ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        isLocalHost(url.hostname)
      ) problems.push('INVALID=NEXT_PUBLIC_SUPABASE_URL')

      if (url.hostname.toLowerCase() !== `${AUTHORIZED_PROJECT_REF}.supabase.co`) {
        problems.push('UNAUTHORIZED_PROJECT=NEXT_PUBLIC_SUPABASE_URL')
      }
    }
  }

  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (anonKey && (anonKey.length < 32 || PLACEHOLDER.test(anonKey))) {
    problems.push('INVALID=NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return problems
}

if (process.env.NODE_ENV === 'production') {
  const problems = validateProductionEnvironment(process.env)
  if (problems.length) {
    console.error('CITADELLE_PROD_ENV_GUARD=FAIL')
    for (const problem of problems) console.error(problem)
    process.exit(1)
  }
}

console.log('CITADELLE_PROD_ENV_GUARD=PASS')

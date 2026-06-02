/**
 * Lit la chaîne de connexion Postgres depuis .env.local (ligne commençant par
 * `SUPABASE_DB_URL=` OU par `postgres`), encode correctement le mot de passe
 * (caractères spéciaux @, !, etc.) et écrit une URL VALIDE dans .dburl.tmp.
 *
 * N'affiche JAMAIS le mot de passe en clair.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const lines = readFileSync('.env.local', 'utf8').split(/\r?\n/)
let raw = ''
for (const l of lines) {
  const t = l.trim()
  if (t.startsWith('SUPABASE_DB_URL=')) { raw = t.slice('SUPABASE_DB_URL='.length).trim(); break }
  if (t.startsWith('postgres://') || t.startsWith('postgresql://')) { raw = t; break }
}
raw = raw.replace(/^["']|["']$/g, '')
if (!raw) { console.error('Aucune chaîne postgres trouvée dans .env.local'); process.exit(1) }

// postgresql://USER:PASSWORD@HOST:PORT/DB   (le HOST n'a pas de '@', on coupe au DERNIER '@')
const m = raw.match(/^(postgres(?:ql)?:\/\/)([^:]+):(.*)@([^@]+)$/)
if (!m) { console.error('Format de chaîne non reconnu.'); process.exit(1) }
const [, scheme, user, password, hostpart] = m
const safe = `${scheme}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostpart}`

writeFileSync('.dburl.tmp', safe, { mode: 0o600 })
console.log(`OK — URL encodée écrite dans .dburl.tmp (hôte: ${hostpart.split(':')[0]}, mot de passe: ${password.length} caractères masqués).`)

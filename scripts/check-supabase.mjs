/**
 * Diagnostic de mise en production — Citadelle du Royaume.
 *
 * Vérifie : variables d'env présentes, connexion Supabase, tables clés, buckets.
 * N'AFFICHE JAMAIS la valeur des secrets.
 *
 * Usage (à la racine du projet) :
 *   node scripts/check-supabase.mjs
 *
 * Lit les variables depuis l'environnement OU depuis un fichier .env.local
 * présent à la racine (parsé automatiquement).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// --- Charger .env.local si présent (sans dépendance externe) ----------------
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const ok = (s) => `\x1b[32m✓\x1b[0m ${s}`
const ko = (s) => `\x1b[31m✗\x1b[0m ${s}`
const warn = (s) => `\x1b[33m!\x1b[0m ${s}`
let failures = 0

console.log('\n=== 1) Variables d\'environnement ===')
const REQUIRED = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_ACCESS_CODE',
  'ADMIN_SESSION_TOKEN',
]
for (const k of REQUIRED) {
  if (process.env[k] && process.env[k].length > 0) console.log(ok(`${k} (présente, ${process.env[k].length} caractères)`))
  else { console.log(ko(`${k} MANQUANTE`)); failures++ }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n=== 2) Connexion Supabase ===')
const stillPlaceholder = [url, service, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.ADMIN_ACCESS_CODE, process.env.ADMIN_SESSION_TOKEN]
  .some((v) => v && v.includes('REMPLACER'))
if (stillPlaceholder) {
  console.log(ko('Valeurs encore non renseignées (« REMPLACER_… » détecté dans .env.local).'))
  console.log('   → Édite .env.local et remplace TOUTES les valeurs REMPLACER_… par tes vraies clés, puis relance.')
  console.log('\nRésultat : \x1b[33mEN ATTENTE\x1b[0m — renseigne les vraies valeurs puis relance.\n')
  process.exit(1)
}
if (!url || !service) {
  console.log(ko('Impossible de tester la connexion : URL ou service_role manquante.'))
  console.log('\nRésultat : \x1b[31mÉCHEC\x1b[0m — corrigez les variables puis relancez.\n')
  process.exit(1)
}
if (!/^https?:\/\//i.test(url) || !url.includes('.supabase.co')) {
  console.log(ko(`URL invalide : "${url}" (attendu https://xxxx.supabase.co)`))
  console.log('\nRésultat : \x1b[31mÉCHEC\x1b[0m — corrige NEXT_PUBLIC_SUPABASE_URL puis relance.\n')
  process.exit(1)
}
let supa
try {
  supa = createClient(url, service, { auth: { persistSession: false } })
  console.log(ok('Client Supabase initialisé.'))
} catch (e) {
  console.log(ko(`Création du client échouée : ${e.message}`))
  process.exit(1)
}

console.log('\n=== 4) Tables clés ===')
const TABLES = ['profiles', 'cms_articles', 'cms_pages', 'cms_media', 'giving_products', 'formations', 'dons']
for (const t of TABLES) {
  try {
    // NB : pas de head:true (masque les 404). On lit le count réel.
    const { data, count, error } = await supa.from(t).select('*', { count: 'exact' }).limit(1)
    if (error) { console.log(ko(`${t} → ${error.message}`)); failures++ }
    else console.log(ok(`${t} (${count ?? (data ? data.length : 0)} ligne(s))`))
  } catch (e) { console.log(ko(`${t} → ${e.message}`)); failures++ }
}

console.log('\n=== 5) Buckets Storage ===')
try {
  const { data, error } = await supa.storage.listBuckets()
  if (error) { console.log(ko(`listBuckets → ${error.message}`)); failures++ }
  else {
    const names = (data || []).map((b) => b.id)
    for (const b of ['media', 'avatars']) {
      if (names.includes(b)) console.log(ok(`bucket "${b}" présent`))
      else { console.log(ko(`bucket "${b}" ABSENT`)); failures++ }
    }
  }
} catch (e) { console.log(ko(`Storage → ${e.message}`)); failures++ }

console.log('\n=== 7) Mode démo ===')
console.log(url && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? ok('Mode démo DÉSACTIVÉ (Supabase configuré)')
  : ko('Mode démo ACTIF (variables manquantes)'))

console.log('\n──────────────────────────────')
if (failures === 0) {
  console.log('\x1b[32mRÉSULTAT : TOUT EST VERT ✅ — prêt pour le déploiement.\x1b[0m\n')
  process.exit(0)
} else {
  console.log(`\x1b[31mRÉSULTAT : ${failures} problème(s) détecté(s) ✗\x1b[0m\n`)
  process.exit(1)
}

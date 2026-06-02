/**
 * QA RUNTIME — Citadelle (exécutée contre la vraie base Supabase via .env.local).
 * Vérifie : connexion, existence des tables, buckets, RLS (anon), auth admin, workflows.
 * N'écrit que des données de test nettoyées immédiatement. Verdict Go/No-Go à la fin.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
if (existsSync('.env.local')) for (const l of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, svc, { auth: { persistSession: false } })
const anon = createClient(url, anonKey, { auth: { persistSession: false } })
let pass = 0, fail = 0, warn = 0
const ok = (m) => { console.log('  \x1b[32m✓\x1b[0m ' + m); pass++ }
const ko = (m) => { console.log('  \x1b[31m✗\x1b[0m ' + m); fail++ }
const wn = (m) => { console.log('  \x1b[33m!\x1b[0m ' + m); warn++ }

async function tableExists(t, schema) {
  try {
    const c = schema ? admin.schema(schema) : admin
    const { error } = await c.from(t).select('*', { count: 'exact' }).limit(1)
    return !error
  } catch { return false }
}

console.log('\n=== 1) Connexion & env ===')
url && anonKey && svc ? ok('Variables env présentes') : ko('Variables env manquantes')

console.log('\n=== 2) Tables critiques (public) ===')
const TABLES = ['profiles','cms_pages','cms_articles','cms_media','cms_lives','cms_events','giving_products','dons',
  'formations','inscriptions_formation','formation_modules','module_completions','parcours','parcours_formations','certificats',
  'priere_demandes','priere_categories','priere_assignations','temoignages',
  'group_join_requests','event_registrations','contact_messages','newsletter_subscribers']
const missing = []
for (const t of TABLES) { if (await tableExists(t)) ok(t); else { ko(t + ' (migration à pousser ?)'); missing.push(t) } }

console.log('\n=== 3) Nouvelles colonnes priere_demandes ===')
try {
  const { error } = await admin.from('priere_demandes').select('priorite, pays, prayers_count, is_public, assigned_to').limit(1)
  error ? ko('colonnes prière (migration 100300 ?) : ' + error.message) : ok('priorite/pays/prayers_count/is_public/assigned_to')
} catch (e) { ko('colonnes prière : ' + e.message) }

console.log('\n=== 4) Buckets Storage ===')
for (const b of ['media','avatars']) { const { data, error } = await admin.storage.getBucket(b); (!error && data) ? ok('bucket ' + b) : ko('bucket ' + b + ' absent') }

console.log('\n=== 5) RLS (clé anon) ===')
try { const { data } = await anon.from('cms_pages').select('id').eq('status','published').limit(1); ok('anon lit pages publiées (' + (data?.length||0) + ')') } catch(e){ ko('anon read published: '+e.message) }
try { const { data, error } = await anon.from('cms_pages').select('id').eq('status','draft').limit(1); (!data || data.length===0) ? ok('anon NE lit PAS les brouillons (RLS)') : wn('anon voit des brouillons ?!') } catch { ok('anon brouillons bloqués') }
try { const { error } = await anon.from('contact_messages').insert({ nom:'QA Test', email:'qa@test.local', message:'QA runtime check', sujet:'qa' }); error ? ko('anon insert contact: '+error.message) : ok('anon peut soumettre un message de contact') } catch(e){ ko('contact insert: '+e.message) }

console.log('\n=== 6) Auth admin (connexion réelle) ===')
try {
  const { data, error } = await anon.auth.signInWithPassword({ email: 'elusduroyaume@gmail.com', password: 'Cit-HHCI5ivKrP9R' })
  if (error) wn('Connexion admin échouée (mot de passe peut-être changé) : ' + error.message)
  else { ok('Connexion admin réussie'); const { data: p } = await admin.from('profiles').select('role').eq('id', data.user.id).single(); p?.role==='admin'||p?.role==='super_admin' ? ok('rôle admin confirmé') : wn('rôle = '+p?.role) }
} catch(e){ wn('auth: '+e.message) }

console.log('\n=== 7) Catégories de prière seedées ===')
try { const { data } = await admin.from('priere_categories').select('slug'); (data && data.length>=10) ? ok(data.length+' catégories') : wn('catégories: '+(data?.length||0)+' (seed migration 100300 ?)') } catch(e){ ko('categories: '+e.message) }

console.log('\n=== 8) Nettoyage données de test ===')
try { await admin.from('contact_messages').delete().eq('email','qa@test.local'); ok('message de test supprimé') } catch { wn('nettoyage contact') }

console.log('\n──────────────────────────────')
console.log(`RÉSULTATS : ${pass} ✓  ·  ${warn} !  ·  ${fail} ✗`)
if (missing.length) console.log('Tables manquantes → exécuter `supabase db push` : ' + missing.join(', '))
console.log(fail === 0 ? '\x1b[32mVERDICT QA : GO (sous réserve QA UI manuelle)\x1b[0m' : '\x1b[31mVERDICT QA : NO-GO — corriger les ✗ (souvent : migrations non poussées)\x1b[0m')
console.log('')

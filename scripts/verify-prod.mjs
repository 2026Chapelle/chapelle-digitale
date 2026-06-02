// Vérification READ-ONLY de l'état du projet Supabase connecté (.env.local).
// Aucune écriture, aucun DDL. Ne logge aucune valeur secrète.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}
loadEnv('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !svc) { console.log('SUPABASE NON CONFIGURÉ (.env.local)'); process.exit(0) }
console.log('Projet :', url.replace(/^https:\/\//, '').split('.')[0], '\n')

const admin = createClient(url, svc, { auth: { persistSession: false } })
const pub = createClient(url, anon, { auth: { persistSession: false } })

// Probe d'existence d'une colonne/table via select limit 0 (service role).
async function probe(label, table, cols, schema) {
  try {
    const c = schema ? admin.schema(schema) : admin
    const { error } = await c.from(table).select(cols, { head: true, count: 'exact' }).limit(1)
    console.log(`${error ? '❌' : '✅'} ${label.padEnd(48)} ${error ? error.message.slice(0, 60) : 'OK'}`)
    return !error
  } catch (e) { console.log(`❌ ${label.padEnd(48)} ${String(e.message).slice(0, 60)}`); return false }
}

console.log('── Migrations de cette session (colonnes/tables attendues) ──')
await probe('130000 dons.source/chariow_transaction_id', 'dons', 'id, source, chariow_transaction_id, programme')
await probe('120000 formation_questions (table)', 'formation_questions', 'id, reponse, statut')
await probe('140000 delivrance_demandes (table)', 'delivrance_demandes', 'id, statut, notes_internes')
await probe('140000 delivrance_ressources (table)', 'delivrance_ressources', 'id, type, titre')
await probe('150000 groupes.pays/ville', 'groupes', 'id, pays, ville')
await probe('110000 integration_journeys jalons 6-8', 'integration_journeys', 'id, a_ete_baptise, a_rejoint_service, a_suivi_leadership', 'chapelle')

console.log('\n── Tables socle V2 (vagues précédentes) ──')
await probe('priere_demandes (is_public/assigned_to)', 'priere_demandes', 'id, is_public, assigned_to, statut')
await probe('temoignages (statut/is_public)', 'temoignages', 'id, statut, is_public, valide_le')
await probe('certificats (reference)', 'certificats', 'id, reference, type')
await probe('cms_homepage_blocks', 'cms_homepage_blocks', 'id, block_key, is_active, sort_order')
await probe('cms_events (platform)', 'cms_events', 'id, platform, status')
await probe('giving_products (success_return_url)', 'giving_products', 'id, success_return_url')

console.log('\n── RPC ──')
try { const { error } = await admin.schema('chapelle').rpc('integration_funnel'); console.log(`${error ? '❌' : '✅'} chapelle.integration_funnel()`.padEnd(50), error ? error.message.slice(0, 50) : 'OK') } catch (e) { console.log('❌ integration_funnel', String(e.message).slice(0, 50)) }

console.log('\n── RLS confidentialité (client ANON) ──')
try {
  const { data, error } = await pub.from('delivrance_demandes').select('id').limit(1)
  console.log(`délivrance (anon) : ${error ? 'BLOQUÉ ✅ (' + error.message.slice(0, 40) + ')' : (data?.length ? 'FUITE ❌ (' + data.length + ' lignes lisibles)' : 'OK ✅ (0 ligne)')}`)
} catch (e) { console.log('délivrance (anon):', String(e.message).slice(0, 50)) }
try {
  const { data, error } = await pub.from('temoignages').select('id, statut, is_public').limit(50)
  const bad = (data || []).filter((t) => t.statut !== 'valide' || t.is_public !== true)
  console.log(`témoignages publics (anon) : ${error ? 'erreur ' + error.message.slice(0, 30) : (bad.length ? 'FUITE ❌ (' + bad.length + ' non-valides exposés)' : 'OK ✅ (' + (data?.length || 0) + ' validés publics)')}`)
} catch (e) { console.log('témoignages (anon):', String(e.message).slice(0, 50)) }

console.log('\n── Données réelles (comptes) ──')
for (const t of ['profiles', 'cms_events', 'formations', 'priere_demandes', 'dons']) {
  try { const { count, error } = await admin.from(t).select('*', { head: true, count: 'exact' }); console.log(`${t.padEnd(20)} ${error ? 'n/a' : count}`) } catch {}
}

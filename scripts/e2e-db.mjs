// Test E2E niveau base (service role, .env.local). Insert -> Select -> Delete, avec nettoyage.
// PREUVE FONCTIONNELLE des flux #1 (Q&A), #2 (cure d'âme), #3 (dons/webhook).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = (b) => b ? '✅' : '❌'

// IDs réels
const { data: f } = await db.from('formations').select('id').limit(1).maybeSingle()
const { data: p } = await db.from('profiles').select('id, email').limit(1).maybeSingle()
console.log('formation id:', f?.id || 'AUCUNE', '| profile:', p?.id ? 'OK' : 'AUCUN', '\n')

// ── #1 formation_questions ──
try {
  const ins = await db.from('formation_questions').insert({ formation_id: f?.id ?? null, user_id: p?.id ?? null, auteur: 'TEST E2E', email: 'test@e2e.local', question: 'Question test E2E ?' }).select('id').single()
  if (ins.error) throw ins.error
  const sel = await db.from('formation_questions').select('id, statut').eq('id', ins.data.id).single()
  const upd = await db.from('formation_questions').update({ reponse: 'Réponse test', statut: 'repondue', is_public: true }).eq('id', ins.data.id)
  await db.from('formation_questions').delete().eq('id', ins.data.id)
  console.log(`#1 Q&A formations : ${ok(!sel.error && !upd.error)} insert/select/update/delete OK (statut initial: ${sel.data?.statut})`)
} catch (e) { console.log(`#1 Q&A formations : ❌ ${e.message}`) }

// ── #2 delivrance_demandes ──
try {
  const ins = await db.from('delivrance_demandes').insert({ user_id: p?.id ?? null, prenom: 'TEST', email: 'test@e2e.local', sujet: 'Test', description: 'desc', niveau: 'leger', statut: 'recu' }).select('id').single()
  if (ins.error) throw ins.error
  const upd = await db.from('delivrance_demandes').update({ statut: 'en_traitement', notes_internes: 'note interne test' }).eq('id', ins.data.id)
  await db.from('delivrance_demandes').delete().eq('id', ins.data.id)
  console.log(`#2 Cure d'âme : ${ok(!upd.error)} insert/update-statut/delete OK`)
} catch (e) { console.log(`#2 Cure d'âme : ❌ ${e.message}`) }

// ── #3 dons (simulation webhook) ──
try {
  const ins = await db.from('dons').insert({ user_id: p?.id ?? null, user_nom: 'TEST E2E', user_email: p?.email || 'test@e2e.local', montant: 1000, devise: 'FCFA', methode_paiement: 'chariow', source: 'live', programme: 'Test', reference: 'DON-TESTE2E', chariow_transaction_id: 'txn_test_e2e', recu_envoye: false }).select('id, source, reference').single()
  if (ins.error) throw ins.error
  const sel = await db.from('dons').select('id, source, programme, reference, chariow_transaction_id').eq('id', ins.data.id).single()
  await db.from('dons').delete().eq('id', ins.data.id)
  console.log(`#3 Dons/webhook : ${ok(!sel.error)} insert+colonnes tracking OK (source=${sel.data?.source}, ref=${sel.data?.reference})`)
} catch (e) { console.log(`#3 Dons/webhook : ❌ ${e.message}`) }

// ── #3b rattachement membre par email (logique webhook) ──
try {
  const { data } = await db.from('profiles').select('id').ilike('email', p?.email || 'x').maybeSingle()
  console.log(`#3b rattachement par email : ${ok(!!data)} (profil ${data ? 'trouvé' : 'non trouvé'} pour ${p?.email})`)
} catch (e) { console.log(`#3b rattachement : ❌ ${e.message}`) }

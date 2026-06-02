// Diagnostic E2E factuel (service role + client anon). Lecture + test insert/delete.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, svc = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = createClient(url, svc, { auth: { persistSession: false } })
const pub = createClient(url, anon, { auth: { persistSession: false } })

console.log('=== #1 ÉVÉNEMENTS : cms_events (service role) ===')
{
  const { data, error } = await db.from('cms_events').select('id, title, status, starts_at, location, is_online, lien_live')
  if (error) console.log('ERREUR svc:', error.message)
  else { console.log(`total: ${data.length}`); data.forEach((e) => console.log(`  - "${e.title}" status=${e.status} starts=${e.starts_at || 'NULL'} online=${e.is_online}`)) }
}
console.log('--- même requête côté MEMBRE (anon, status=published) ---')
{
  const { data, error } = await pub.from('cms_events').select('id, title, status').eq('status', 'published')
  console.log(error ? `anon ERREUR: ${error.message}` : `anon voit ${data.length} événement(s) published`)
}

console.log('\n=== #2 formation_questions (insert test service role) ===')
{
  const { data: f } = await db.from('formations').select('id').limit(1).maybeSingle()
  const ins = await db.from('formation_questions').insert({ formation_id: f?.id ?? null, question: 'diag', auteur: 'diag' }).select('id').single()
  if (ins.error) console.log('❌', ins.error.message)
  else { console.log('✅ insert OK'); await db.from('formation_questions').delete().eq('id', ins.data.id) }
}

console.log('\n=== #3 CERTIFICATS : lignes existantes + cohérence référence ===')
{
  const { data, error } = await db.from('certificats').select('id, reference, type, titre, user_id, delivre_le')
  if (error) console.log('ERREUR:', error.message)
  else {
    console.log(`total certificats: ${data.length}`)
    data.forEach((c) => console.log(`  - ref="${c.reference}" type=${c.type} titre="${c.titre}"`))
    // Simule la vérification publique (route /api/certificat/[reference]) sur la 1ère réf
    if (data[0]) {
      const ref = String(data[0].reference || '').trim().toUpperCase()
      const { data: hit } = await db.from('certificats').select('reference').eq('reference', ref).maybeSingle()
      console.log(`  lookup "${ref}" → ${hit ? 'TROUVÉ ✅' : 'INTROUVABLE ❌ (réf stockée ≠ uppercase ?)'}`)
    }
  }
}

console.log('\n=== #4 delivrance_demandes (insert test service role) ===')
{
  const { data: p } = await db.from('profiles').select('id').limit(1).maybeSingle()
  const ins = await db.from('delivrance_demandes').insert({ user_id: p?.id ?? null, sujet: 'diag', statut: 'recu' }).select('id').single()
  if (ins.error) console.log('❌', ins.error.message)
  else { console.log('✅ insert OK'); await db.from('delivrance_demandes').delete().eq('id', ins.data.id) }
}

console.log('\n=== #7 activity_logs / nation (existence) ===')
for (const t of ['activity_logs', 'nation_responsables', 'sensitive_access_logs']) {
  const { error } = await db.from(t).select('id', { head: true, count: 'exact' }).limit(1)
  console.log(`  ${t}: ${error ? '❌ ' + error.message.slice(0, 50) : '✅ existe'}`)
}

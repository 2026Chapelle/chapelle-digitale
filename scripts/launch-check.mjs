/**
 * Vérification d'ouverture V1 — Citadelle du Royaume.
 * Lecture seule. Vérifie migrations récentes, tables clés, et le Super Admin.
 *   node scripts/launch-check.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let fail = 0

console.log('\n=== Migrations récentes ===')
{
  const { error } = await s.from('cms_events').select('whatsapp').limit(1)
  if (error) { console.log(`✗ cms_events.whatsapp → ${error.message}`); fail++ } else console.log('✓ cms_events.whatsapp')
}
{
  const { count, error } = await s.from('newsletter_campaigns').select('*', { count: 'exact' }).limit(1)
  if (error) { console.log(`✗ newsletter_campaigns → ${error.message}`); fail++ } else console.log(`✓ newsletter_campaigns (${count} ligne(s))`)
}

console.log('\n=== Tables clés ===')
for (const t of ['cms_testimonies', 'cms_podcasts', 'cms_lives', 'cms_events', 'formation_modules', 'inscriptions_formation', 'module_completions', 'certificats', 'priere_demandes', 'event_registrations', 'newsletter_subscribers', 'contact_messages']) {
  const { count, error } = await s.from(t).select('*', { count: 'exact' }).limit(1)
  if (error) { console.log(`✗ ${t} → ${error.message}`); fail++ } else console.log(`✓ ${t} (${count})`)
}

console.log('\n=== Super Admin ===')
{
  const { data, error } = await s.from('profiles').select('email,role,membre_statut').order('created_at', { ascending: true })
  if (error) { console.log('✗ profiles →', error.message); fail++ }
  else {
    const admins = data.filter((p) => ['admin', 'super_admin'].includes(p.role))
    console.log(`profils: ${data.length} · admins: ${admins.length}`)
    admins.forEach((a) => console.log(`  ADMIN ${a.email || '(sans email)'} — ${a.role}`))
    if (!admins.length) { console.log('  ! Aucun admin'); fail++ }
  }
}

console.log('\n──────────────')
console.log(fail === 0 ? '\x1b[32mGO — tout est vert.\x1b[0m\n' : `\x1b[31mNO GO — ${fail} point(s) à corriger.\x1b[0m\n`)
process.exit(fail === 0 ? 0 : 1)

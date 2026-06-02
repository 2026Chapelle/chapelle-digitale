/**
 * Crée (ou promeut) le premier administrateur, puis teste la connexion réelle.
 * Usage : node scripts/create-admin.mjs "email" "Prénom" "Nom"
 */
import { readFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) for (const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}

const [email, prenom = 'Admin', nom = 'Citadelle'] = process.argv.slice(2)
if (!email) { console.error('Email requis'); process.exit(1) }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const password = 'Cit-' + randomBytes(9).toString('base64url')

// 1) Créer le compte (ou récupérer s'il existe déjà)
let userId
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { prenom, nom, role: 'visiteur' },
})
if (cErr) {
  if (/registered|exists/i.test(cErr.message)) {
    const { data: list } = await admin.auth.admin.listUsers()
    const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!found) { console.error('Compte existant introuvable :', cErr.message); process.exit(1) }
    userId = found.id
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
    console.log('ℹ️  Compte déjà existant → mot de passe réinitialisé.')
  } else { console.error('Échec création :', cErr.message); process.exit(1) }
} else {
  userId = created.user.id
  console.log('✓ Compte auth créé :', email)
}

// 2) Laisser le trigger créer le profil, puis promouvoir en admin
await new Promise((r) => setTimeout(r, 800))
const { error: upErr } = await admin.from('profiles')
  .update({ role: 'admin', prenom, nom, membre_statut: 'pasteur' })
  .eq('id', userId)
if (upErr) {
  // Profil pas encore créé ? on l'insère.
  await admin.from('profiles').upsert({ id: userId, email, prenom, nom, role: 'admin', membre_statut: 'pasteur' })
}
const { data: prof } = await admin.from('profiles').select('id, email, prenom, nom, role, membre_statut').eq('id', userId).single()
console.log('✓ Profil :', JSON.stringify(prof))

// 3) Tester la connexion réelle (étape 9) avec la clé publique
const { data: signin, error: sErr } = await anon.auth.signInWithPassword({ email, password })
console.log('\n=== Test de connexion réelle (étape 9) ===')
if (sErr) console.log('✗ Connexion ÉCHOUÉE :', sErr.message)
else console.log(`✓ Connexion RÉUSSIE — session obtenue (user ${signin.user.id.slice(0,8)}…), rôle "${prof?.role}"`)

console.log('\n────────────────────────────────────────')
console.log('  IDENTIFIANTS ADMIN (à conserver, change le mot de passe au 1er login)')
console.log('  Email    :', email)
console.log('  Mot de passe TEMPORAIRE :', password)
console.log('────────────────────────────────────────')

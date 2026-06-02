/**
 * SEED DE DÉMARRAGE — Citadelle (structure réelle, éditable, ZÉRO fictif).
 *
 * N'insère AUCUN faux membre, faux chiffre, faux témoignage ou fausse date.
 * Crée uniquement une STRUCTURE de départ réelle que l'équipe pastorale
 * complétera/éditera depuis le back-office :
 *   - 1 formation « Fondements de la Foi » + 3 modules (texte doctrinal réel)
 *   - 1 parcours « Nouveau Converti » reliant cette formation
 *
 * À lancer APRÈS `supabase db push` (les tables LMS doivent exister) :
 *   node scripts/seed-starter.mjs
 * Idempotent : relançable sans doublon (vérifie par slug).
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

if (existsSync('.env.local')) for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Variables Supabase manquantes (.env.local).'); process.exit(1) }
const db = createClient(url, key, { auth: { persistSession: false } })

async function upsertFormation() {
  const slug = 'fondements-foi'
  const { data: ex } = await db.from('formations').select('id').eq('slug', slug).maybeSingle()
  if (ex) { console.log('• Formation déjà présente'); return ex.id }
  const { data, error } = await db.from('formations').insert({
    titre: 'Fondements de la Foi',
    slug,
    contenu_court: 'Les bases essentielles de la vie chrétienne.',
    description: "Un parcours d'introduction pour tout nouveau croyant : le salut, le baptême et la vie de prière.",
    instructeur_nom: 'Équipe pastorale',
    niveau: 'debutant', type: 'parcours', statut: 'publie',
    gratuit: true, certifiant: true,
  }).select('id').single()
  if (error) throw error
  console.log('✓ Formation créée : Fondements de la Foi')
  return data.id
}

async function seedModules(formationId) {
  const modules = [
    { ordre: 0, titre: 'Le Salut en Jésus-Christ', contenu_texte: "Dieu nous aime et offre le salut par grâce, au moyen de la foi en Jésus-Christ (Éphésiens 2.8). Reconnaître Jésus comme Seigneur et Sauveur est le premier pas de la vie nouvelle." },
    { ordre: 1, titre: 'Le Baptême d\'eau', contenu_texte: "Le baptême est un acte d'obéissance et un témoignage public de la foi (Matthieu 28.19). Il symbolise la mort au péché et la nouvelle vie en Christ." },
    { ordre: 2, titre: 'La Vie de Prière', contenu_texte: "La prière est le souffle du croyant : un dialogue quotidien avec le Père. Commencez par des temps simples et réguliers d'adoration, de demande et d'écoute." },
  ]
  for (const m of modules) {
    const { data: ex } = await db.from('formation_modules').select('id').eq('formation_id', formationId).eq('ordre', m.ordre).maybeSingle()
    if (ex) continue
    await db.from('formation_modules').insert({
      formation_id: formationId, ordre: m.ordre, titre: m.titre, type: 'texte',
      contenu_texte: m.contenu_texte, duree_minutes: 10, acces_min_statut: 'membre', status: 'published', langue: 'fr',
    })
    console.log('  ✓ Module :', m.titre)
  }
}

async function upsertParcours(formationId) {
  const slug = 'nouveau-converti'
  let pid
  const { data: ex } = await db.from('parcours').select('id').eq('slug', slug).maybeSingle()
  if (ex) { pid = ex.id; console.log('• Parcours déjà présent') }
  else {
    const { data, error } = await db.from('parcours').insert({
      slug, titre: 'Nouveau Converti',
      description: "Le premier parcours du tunnel : poser des fondations solides après la conversion.",
      categorie: 'conversion', etape_tunnel: 'converti', status: 'published', langue: 'fr', ordre: 0,
    }).select('id').single()
    if (error) throw error
    pid = data.id
    console.log('✓ Parcours créé : Nouveau Converti')
  }
  const { data: link } = await db.from('parcours_formations').select('id').eq('parcours_id', pid).eq('formation_id', formationId).maybeSingle()
  if (!link) { await db.from('parcours_formations').insert({ parcours_id: pid, formation_id: formationId, ordre: 0 }); console.log('  ✓ Formation reliée au parcours') }
}

try {
  console.log('\n=== SEED DE DÉMARRAGE (structure réelle) ===')
  const fid = await upsertFormation()
  await seedModules(fid)
  await upsertParcours(fid)
  console.log('\n✅ Seed terminé. Éditez/complétez librement depuis le back-office.\n')
} catch (e) {
  console.error('\n✗ Échec du seed :', e.message)
  console.error('  (Avez-vous exécuté `supabase db push` ? Les tables LMS doivent exister.)\n')
  process.exit(1)
}

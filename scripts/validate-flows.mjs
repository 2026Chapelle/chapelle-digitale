/**
 * Valide les flux 10 (article), 11 (upload média), 12 (Chariow) côté back-end.
 * Effectue de vraies écritures puis nettoie ce qui est temporaire.
 */
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
if (existsSync('.env.local')) for (const line of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

// ===== 10) Création d'un article =====
console.log('=== 10) Création d\'un article ===')
const slug = 'test-mise-en-production'
const { data: art, error: aErr } = await admin.from('cms_articles')
  .insert({ title: 'Test de mise en production', slug, excerpt: 'Article de vérification.', body: 'Ceci confirme que la création d\'articles fonctionne.', status: 'published', author: 'Doxa Salomon', category: 'systeme' })
  .select().single()
if (aErr) console.log('✗ Insert article:', aErr.message)
else {
  console.log('✓ Article créé (id', art.id.slice(0,8) + '…)')
  // Lecture publique (anon, RLS = published only) → simule l'affichage sur /articles
  const { data: pub } = await anon.from('cms_articles').select('title,slug,status').eq('slug', slug).single()
  console.log(pub ? `✓ Visible publiquement : "${pub.title}" (${pub.status})` : '✗ Non visible côté public')
  // Nettoyage
  await admin.from('cms_articles').delete().eq('id', art.id)
  console.log('✓ Article de test supprimé (nettoyage).')
}

// ===== 11) Upload d'une image =====
console.log('\n=== 11) Upload d\'une image (bucket media) ===')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
const path = 'images/prod-check.png'
const { error: uErr } = await admin.storage.from('media').upload(path, png, { contentType: 'image/png', upsert: true })
if (uErr) console.log('✗ Upload:', uErr.message)
else {
  const { data: pubUrl } = admin.storage.from('media').getPublicUrl(path)
  console.log('✓ Upload réussi →', pubUrl.publicUrl)
  try {
    const resp = await fetch(pubUrl.publicUrl)
    console.log(resp.ok ? `✓ Image accessible publiquement (HTTP ${resp.status})` : `✗ Accès image HTTP ${resp.status}`)
  } catch (e) { console.log('✗ Fetch image:', e.message) }
  await admin.storage.from('media').remove([path])
  console.log('✓ Image de test supprimée (nettoyage).')
}

// ===== 12) Chariow =====
console.log('\n=== 12) Chariow (catalogue de dons) ===')
const { data: prods, error: pErr } = await anon.from('giving_products').select('public_title,type,direct_url,product_id,is_active').eq('is_active', true)
if (pErr) console.log('✗ Lecture produits:', pErr.message)
else {
  console.log(`✓ ${prods.length} produit(s) actif(s) lisibles publiquement :`)
  for (const p of prods) console.log(`   • ${p.public_title} (${p.type}) — lien:${p.direct_url ? 'oui' : 'non'} / product_id:${p.product_id || '—'}`)
}

console.log('\n──────────────────────────────')
console.log('Validation back-end terminée.')

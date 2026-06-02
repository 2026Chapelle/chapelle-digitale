import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
if (existsSync('.env.local')) for (const l of readFileSync('.env.local','utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const { data: f } = await anon.from('formations').select('id,titre,slug').eq('statut','publie')
console.log('Formations publiées visibles (anon):', (f||[]).map(x=>x.titre).join(' | ') || 'aucune')
if (f && f[0]) {
  const { data: mods } = await anon.from('formation_modules').select('titre,ordre').eq('formation_id', f[0].id).eq('status','published').order('ordre')
  console.log('Modules visibles:', (mods||[]).map(m=>`${m.ordre}.${m.titre}`).join(' | ') || 'aucun')
}
const { data: p } = await anon.from('parcours').select('titre,etape_tunnel').eq('status','published')
console.log('Parcours publiés:', (p||[]).map(x=>`${x.titre}(${x.etape_tunnel})`).join(' | ') || 'aucun')
const { data: cats } = await anon.from('priere_categories').select('slug')
console.log('Catégories prière (anon):', cats?.length || 0)

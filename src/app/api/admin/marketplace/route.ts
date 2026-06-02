import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { isAdminRequest } from '@/lib/admin-auth'
import { rateLimit, clientIp } from '@/lib/rate-limit'

const DEVISES = new Set(['FCFA', 'XOF', 'EUR', 'USD', 'GBP', 'CAD', 'CHF', 'NGN', 'GHS'])
const writeLimited = (req: NextRequest) => !rateLimit(`admin-mkt:${clientIp(req)}`, { limit: 60, windowMs: 60 * 1000 }).ok

/**
 * Back-office MARKETPLACE — CRUD des produits (ebooks, livres, masterclass,
 * formations payantes, billets, abonnements, produits numériques/physiques).
 *   GET    /api/admin/marketplace            → liste complète (actifs + inactifs)
 *   POST   /api/admin/marketplace            → créer
 *   PATCH  /api/admin/marketplace            → mettre à jour ({ id, ...champs })
 *   DELETE /api/admin/marketplace?id=...      → supprimer
 *
 * Garde cookie admin, écriture service role. Pensé pour l'échelle multi-devises /
 * multi-pays / multi-antennes (aucune refonte nécessaire pour ajouter un type).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TYPES = new Set(['ebook', 'livre', 'masterclass', 'formation', 'billet', 'abonnement', 'don', 'physique', 'numerique'])
const ACCES = new Set(['telechargement', 'streaming', 'externe', 'aucun'])
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)

const FIELDS = ['slug', 'titre', 'description', 'type', 'prix', 'devise', 'chariow_product_id', 'lien_achat', 'fichier_path', 'cover_url', 'plateforme', 'pays', 'acces_type', 'acces_url', 'actif'] as const

function sanitize(body: any): Record<string, any> {
  const out: Record<string, any> = {}
  for (const f of FIELDS) if (body[f] !== undefined) out[f] = body[f]
  if (out.type && !TYPES.has(out.type)) out.type = 'numerique'
  if (out.acces_type && !ACCES.has(out.acces_type)) out.acces_type = 'telechargement'
  if (out.prix !== undefined) out.prix = Number(out.prix) || 0
  if (out.devise) { const dev = String(out.devise).toUpperCase().slice(0, 8); out.devise = DEVISES.has(dev) ? dev : 'FCFA' }
  if (out.actif !== undefined) out.actif = !!out.actif
  return out
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: true, demo: true, data: [] })
  try {
    const { data, error } = await supabaseAdmin.from('marketplace_products').select('*').order('created_at', { ascending: false }).limit(500)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    // Compteur d'achats par produit (best-effort).
    let counts: Record<string, number> = {}
    try {
      const { data: pp } = await supabaseAdmin.from('product_purchases').select('product_id')
      for (const r of (pp || []) as any[]) if (r.product_id) counts[r.product_id] = (counts[r.product_id] || 0) + 1
    } catch { /* */ }
    const rows = (data || []).map((p: any) => ({ ...p, achats: counts[p.id] || 0 }))
    return NextResponse.json({ ok: true, data: rows })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (writeLimited(req)) return NextResponse.json({ ok: false, message: 'Trop de requêtes.' }, { status: 429 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true })
  try {
    const body = await req.json()
    const row = sanitize(body)
    if (!row.titre) return NextResponse.json({ ok: false, message: 'Titre requis.' }, { status: 400 })
    if (!row.slug) row.slug = slugify(row.titre) || `produit-${Date.now()}`
    if (!row.type) row.type = 'numerique'
    if (!row.devise) row.devise = 'FCFA'
    if (!row.acces_type) row.acces_type = 'telechargement'
    const { data, error } = await supabaseAdmin.from('marketplace_products').insert(row).select('*').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (writeLimited(req)) return NextResponse.json({ ok: false, message: 'Trop de requêtes.' }, { status: 429 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true })
  try {
    const body = await req.json()
    const id = String(body.id || '').trim()
    if (!id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const row = sanitize(body)
    const { data, error } = await supabaseAdmin.from('marketplace_products').update(row).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, data })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ ok: false, message: 'Non autorisé.' }, { status: 401 })
  if (writeLimited(req)) return NextResponse.json({ ok: false, message: 'Trop de requêtes.' }, { status: 429 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true })
  try {
    const id = String(req.nextUrl.searchParams.get('id') || '').trim()
    if (!id) return NextResponse.json({ ok: false, message: 'id requis.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('marketplace_products').delete().eq('id', id)
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 }) }
}

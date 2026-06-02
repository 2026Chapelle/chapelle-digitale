import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// Jetons valides : UUID v4 (anciens achats) ou hex 32-64 (randomBytes).
const TOKEN_RE = /^[a-f0-9-]{20,80}$/i

/**
 * Accès post-achat à un produit numérique (ebook, masterclass, …).
 *   GET /api/acces/<access_token> → { ok, url, titre, type }
 *
 * Le jeton (généré au paiement) authentifie l'accès. Fichier servi via URL
 * signée temporaire (bucket privé 'produits') ; lien externe pour acces_type=externe.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  // Anti-brute-force : 10 tentatives / min / IP (le jeton est le seul facteur d'accès).
  if (!rateLimit(`acces:${clientIp(req)}`, { limit: 10, windowMs: 60 * 1000 }).ok) {
    return NextResponse.json({ ok: false, message: 'Trop de tentatives.' }, { status: 429 })
  }
  const token = (params.token || '').trim()
  if (!token || !TOKEN_RE.test(token)) return NextResponse.json({ ok: false, message: 'Jeton invalide.' }, { status: 400 })
  if (IS_DEMO_MODE) return NextResponse.json({ ok: false, demo: true })

  try {
    const { data: achat } = await supabaseAdmin.from('product_purchases')
      .select('statut, titre, product_id').eq('access_token', token).maybeSingle()
    if (!achat || achat.statut !== 'complete') {
      return NextResponse.json({ ok: false, message: 'Accès invalide ou révoqué.' }, { status: 403 })
    }
    const { data: prod } = await supabaseAdmin.from('marketplace_products')
      .select('titre, type, acces_type, acces_url, fichier_path').eq('id', achat.product_id).maybeSingle()
    if (!prod) return NextResponse.json({ ok: false, message: 'Produit introuvable.' }, { status: 404 })

    if (prod.acces_type === 'externe' && prod.acces_url) {
      return NextResponse.json({ ok: true, titre: prod.titre, type: prod.type, url: prod.acces_url })
    }
    if (prod.fichier_path) {
      const { data: signed, error } = await supabaseAdmin.storage.from('produits').createSignedUrl(prod.fichier_path, 3600)
      if (error || !signed) return NextResponse.json({ ok: false, message: 'Fichier indisponible.' }, { status: 404 })
      return NextResponse.json({ ok: true, titre: prod.titre, type: prod.type, url: signed.signedUrl })
    }
    return NextResponse.json({ ok: false, message: 'Aucun contenu associé.' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur' }, { status: 500 })
  }
}

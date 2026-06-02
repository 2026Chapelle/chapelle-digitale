import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { donationReceiptEmail } from '@/lib/email-templates'
import { logActivity } from '@/lib/activity'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { notifyUser } from '@/lib/notify'

/**
 * Webhook Chariow — confirmation de paiement → enregistre le don RÉEL + reçu.
 *
 *   POST /api/webhook/chariow
 *
 * Chariow étant une boutique externe, ce point d'entrée reçoit les notifications
 * de paiement (à configurer dans Chariow). Parsing DÉFENSIF (le format peut
 * varier) : on cherche email / montant / id de transaction dans les clés usuelles.
 * Idempotent via chariow_transaction_id. Sécurisé par un secret partagé optionnel
 * (en-tête `x-chariow-secret` = env CHARIOW_WEBHOOK_SECRET).
 *
 * Renvoie toujours 200 rapidement (convention webhook) sauf secret invalide.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const pick = (obj: any, keys: string[]): any => {
  for (const k of keys) {
    const v = k.split('.').reduce((o: any, p: string) => (o == null ? o : o[p]), obj)
    if (v !== undefined && v !== null && v !== '') return v
  }
  return undefined
}

/** Recherche RÉCURSIVE : 1ère valeur dont la CLÉ matche `keyRe` et passe `valid`.
 *  Robuste au format Chariow (clé/imbrication inconnues : amount, sale.total, …). */
function deepFind(obj: any, keyRe: RegExp, valid: (v: any) => boolean, depth = 0): any {
  if (obj == null || depth > 6) return undefined
  if (Array.isArray(obj)) {
    for (const it of obj) { const r = deepFind(it, keyRe, valid, depth + 1); if (r !== undefined) return r }
    return undefined
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (keyRe.test(k) && v != null && typeof v !== 'object' && valid(v)) return v
    }
    for (const v of Object.values(obj)) { const r = deepFind(v, keyRe, valid, depth + 1); if (r !== undefined) return r }
  }
  return undefined
}
const toNum = (v: any) => Number(String(v).replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.'))

export async function POST(req: NextRequest) {
  // Anti-abus : 60 requêtes / min / IP (un webhook légitime reste bien en deçà).
  const rl = rateLimit(`chariow-webhook:${clientIp(req)}`, { limit: 60, windowMs: 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json({ ok: false, message: 'Trop de requêtes.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } })
  }
  // Corps BRUT (nécessaire pour la vérification de signature HMAC).
  const rawBody = await req.text()

  // Secret partagé simple (si configuré).
  const secret = process.env.CHARIOW_WEBHOOK_SECRET
  if (secret && req.headers.get('x-chariow-secret') !== secret) {
    return NextResponse.json({ ok: false, message: 'Signature invalide.' }, { status: 401 })
  }

  // Signature HMAC-SHA256 (si configurée) : vérifiée en temps constant sur le corps brut.
  const hmacSecret = process.env.CHARIOW_WEBHOOK_HMAC_SECRET
  if (hmacSecret) {
    const provided = req.headers.get('x-chariow-signature') || req.headers.get('x-signature') || ''
    const computed = createHmac('sha256', hmacSecret).update(rawBody).digest('hex')
    const a = Buffer.from(provided), b = Buffer.from(computed)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return NextResponse.json({ ok: false, message: 'Signature HMAC invalide.' }, { status: 401 })
    }
  }

  let body: any = {}
  try { body = JSON.parse(rawBody) } catch { body = {} }
  // Log clair du payload brut (diagnostic Passenger).
  console.error('[webhook/chariow] RAW PAYLOAD =', JSON.stringify(body).slice(0, 2000))

  // ── Extraction selon le format Chariow RÉEL (clés exactes) ──
  const sale = (body && body.sale) || {}
  const amountObj = sale.amount || {}
  const customer = (body && body.customer) || {}
  const product = (body && body.product) || {}

  const event = String(body?.event ?? '').toLowerCase()                 // payload.event
  const saleStatus = String(sale?.status ?? '').toLowerCase()           // payload.sale.status
  const reference = sale?.id != null ? String(sale.id)                  // payload.sale.id
    : (deepFind(body, /transaction|order|sale|reference|^id$/i, (v) => typeof v === 'string' || typeof v === 'number') ?? null)
  const amount = Number(amountObj?.value) || toNum(deepFind(body, /amount|montant|value|total|price/i, (v) => toNum(v) > 0)) // payload.sale.amount.value
  const currency = amountObj?.currency || pick(body, ['currency', 'devise']) || 'FCFA'   // payload.sale.amount.currency
  const productId = product?.id ?? null                                 // payload.product.id
  const produit = product?.name ?? null                                 // payload.product.name
  const email = String(customer?.email ?? pick(body, ['email', 'customer.email']) ?? '').trim().toLowerCase() // payload.customer.email
  const name = customer?.name || pick(body, ['name', 'customer.name']) || 'Donateur'     // payload.customer.name

  // Journalise toujours l'événement (champs parsés + PAYLOAD BRUT dans meta).
  if (!IS_DEMO_MODE) {
    try {
      await supabaseAdmin.from('giving_transactions_log').insert({
        provider: 'chariow', event_type: 'webhook',
        status: saleStatus || event || 'received',
        amount: amount > 0 ? amount : null, email: email || null,
        chariow_product_id: productId,
        source: pick(body, ['metadata.source', 'source']) ?? null,
        meta: body,
      })
    } catch { /* non bloquant */ }
  }

  // VALIDATION STRICTE : don créé UNIQUEMENT si event=successful.sale ET sale.status=completed.
  const isValidSale = event === 'successful.sale' && saleStatus === 'completed'
  if (IS_DEMO_MODE || !isValidSale || !email || !(amount > 0)) {
    if (!IS_DEMO_MODE) console.error(`[webhook/chariow] ignoré (event=${event}, sale.status=${saleStatus}, email=${!!email}, montant=${amount})`)
    return NextResponse.json({ ok: true, recorded: false })
  }

  try {
    // Rattachement user_id via profiles.email (lowercase).
    let userId: string | null = null
    try {
      const { data: prof } = await supabaseAdmin.from('profiles').select('id').ilike('email', email).maybeSingle()
      userId = prof?.id ?? null
    } catch { /* profil introuvable → don anonyme */ }

    const ref = reference ? String(reference) : `DON-${Date.now()}`
    const row: Record<string, any> = {
      user_id: userId, user_nom: name, user_email: email,
      montant: amount, devise: currency, methode_paiement: 'chariow', statut: 'complete',
      source: pick(body, ['metadata.source', 'source']) ?? 'chariow',
      programme: pick(body, ['metadata.programme', 'programme']) ?? null,
      reference: ref, chariow_transaction_id: ref,
      meta_json: body, webhook_received_at: new Date().toISOString(), recu_envoye: false,
    }
    // Idempotence par id de vente Chariow (sans ON CONFLICT : l'index est partiel).
    // → on vérifie l'existence, puis insert si absent. Jamais 2 dons pour la même vente.
    let don: { id: string; recu_envoye: boolean } | null = null
    let isNew = false
    const { data: existing } = await supabaseAdmin.from('dons')
      .select('id, recu_envoye').eq('chariow_transaction_id', ref).maybeSingle()
    if (existing) {
      don = existing as any
    } else {
      let ins = await supabaseAdmin.from('dons').insert(row).select('id, recu_envoye').single()
      // Résilience : si meta_json/email_sent_at pas encore migrés, réinsérer sans eux.
      if (ins.error && /meta_json|email_sent_at|column|schema cache/i.test(ins.error.message)) {
        const { meta_json, ...base } = row
        ins = await supabaseAdmin.from('dons').insert(base).select('id, recu_envoye').single()
      }
      if (ins.error) throw ins.error
      don = ins.data as any
      isNew = true
    }

    // Journal d'activité — UNE SEULE FOIS, à la création réelle du don
    // (jamais sur une re-livraison du même Pulse → aucun doublon).
    if (isNew) {
      await logActivity({
        userId, nom: name, email, action_type: 'don',
        resource_type: 'don', resource_title: produit || 'Don',
        amount, currency, source: row.source || 'chariow',
        metadata: { reference: ref, product_id: productId, store: body?.store?.name ?? null },
      })

      // Notification TEMPS RÉEL au membre (si rattaché).
      await notifyUser(userId, {
        type: 'don', title: '🙏 Merci pour votre générosité',
        body: `Votre ${produit || 'don'} de ${amount.toLocaleString('fr-FR')} ${currency} a bien été reçu.`,
        href: '/member/dashboard/dons',
        meta: { reference: ref },
      })

      // MARKETPLACE : si le produit Chariow correspond à un produit catalogue,
      // créer l'achat + jeton d'accès (ebook/masterclass/billet…). Best-effort.
      if (productId) {
        try {
          const { data: prod } = await supabaseAdmin.from('marketplace_products')
            .select('id, titre').eq('chariow_product_id', productId).maybeSingle()
          if (prod) {
            await supabaseAdmin.from('product_purchases').insert({
              user_id: userId, email, product_id: prod.id,
              chariow_product_id: productId, chariow_transaction_id: ref, don_id: don?.id ?? null,
              access_token: randomBytes(32).toString('hex'), titre: prod.titre, montant: amount, devise: currency,
            })
            await notifyUser(userId, {
              type: 'achat', title: '🎁 Votre achat est prêt',
              body: `Accédez à « ${prod.titre} » depuis vos achats.`,
              href: '/member/dashboard/achats', meta: { product_id: prod.id },
            })
          }
        } catch (e: any) { console.error('[webhook/chariow] achat marketplace non créé', e?.message) }
      }
    }

    // Reçu PREMIUM — une seule fois (jamais bloquant : le don est déjà créé).
    if (don && !don.recu_envoye) {
      try {
        const { subject, html } = donationReceiptEmail({
          prenom: name, montant: `${amount.toLocaleString('fr-FR')} ${currency}`,
          reference: ref, date: new Date().toLocaleDateString('fr-FR'), methode: 'Chariow',
        })
        const sent = await sendEmail({ to: email, subject, html })
        if (sent.ok) {
          let upd = await supabaseAdmin.from('dons').update({ recu_envoye: true, recu_envoye_at: new Date().toISOString(), email_sent_at: new Date().toISOString() }).eq('id', don.id)
          if (upd.error) await supabaseAdmin.from('dons').update({ recu_envoye: true, recu_envoye_at: new Date().toISOString() }).eq('id', don.id)
        } else {
          console.error('[webhook/chariow] reçu email NON envoyé', sent.error || (sent.skipped ? 'RESEND_API_KEY absente' : ''))
        }
      } catch (e: any) { console.error('[webhook/chariow] étape reçu échouée (don conservé)', e?.message) }
    }
    return NextResponse.json({ ok: true, recorded: true, reference: ref })
  } catch (e: any) {
    console.error('[webhook/chariow] échec enregistrement don', e?.message)
    return NextResponse.json({ ok: true, recorded: false })
  }
}

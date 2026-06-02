import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { TUNNEL_BY_KEY, type TunnelStageKey } from '@/lib/tunnel'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { welcomeEmail } from '@/lib/email-templates'
import { rateLimit, clientIp } from '@/lib/rate-limit'

/**
 * Relais serveur : reçoit un lead du tunnel et :
 *   1. le PERSISTE dans Supabase (schéma `chapelle`) — membre + soumission de
 *      formulaire + parcours d'intégration → alimente le dashboard temps réel ;
 *   2. le pousse dans FluentCRM (abonné + tag de l'étape) si configuré.
 *
 * Compatible avec un déploiement Node standalone (PlanetHoster). Runtime
 * nodejs explicite car on utilise Buffer (Basic Auth).
 */
export const runtime = 'nodejs'

interface IncomingLead {
  prenom?: string
  nom?: string
  email?: string
  telephone?: string
  pays?: string
  stage?: TunnelStageKey
  source?: string
  message?: string
  interets?: string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Jalons du parcours d'intégration activés selon l'étape atteinte.
// Les triggers Supabase recalculent `stage_courant` et remontent members.tunnel_stage.
function journeyFlagsForStage(stage: TunnelStageKey) {
  const flags = {
    a_rempli_formulaire: true,
    a_suivi_parcours: false,
    a_participe_programme: false,
    est_devenu_membre: false,
  }
  if (['integration', 'disciple', 'membre', 'serviteur', 'leader'].includes(stage)) flags.a_suivi_parcours = true
  if (['disciple', 'membre', 'serviteur', 'leader'].includes(stage)) flags.a_participe_programme = true
  if (['membre', 'serviteur', 'leader'].includes(stage)) flags.est_devenu_membre = true
  return flags
}

/**
 * Persiste le lead dans `chapelle` (best-effort, jamais bloquant).
 * Upsert membre par email → form_submission → integration_journey (cier).
 */
async function persistLead(body: IncomingLead, prenom: string, email: string, stage: TunnelStageKey): Promise<{ isNew: boolean }> {
  if (IS_DEMO_MODE) return { isNew: false }
  const db = supabaseAdmin.schema('chapelle')

  // Plateforme cible : CIER (hub) par défaut.
  const { data: plat } = await db.from('platforms').select('id').eq('slug', 'cier').maybeSingle()
  const platformId = plat?.id ?? null

  // Membre : retrouver par email (insensible à la casse) sinon créer.
  let memberId: string | null = null
  let isNew = false
  const { data: existing } = await db.from('members').select('id').ilike('email', email).maybeSingle()
  if (existing?.id) {
    memberId = existing.id
    await db.from('members').update({
      prenom,
      nom: body.nom?.trim() || null,
      telephone: body.telephone?.trim() || null,
      pays: body.pays?.trim() || null,
    }).eq('id', memberId)
  } else {
    isNew = true
    const { data: created } = await db.from('members').insert({
      prenom,
      nom: body.nom?.trim() || null,
      email,
      telephone: body.telephone?.trim() || null,
      pays: body.pays?.trim() || null,
    }).select('id').single()
    memberId = created?.id ?? null
  }

  // Soumission de formulaire (lead).
  await db.from('form_submissions').insert({
    platform_id: platformId,
    member_id: memberId,
    form_slug: body.source || stage,
    source: body.source || 'tunnel',
    email,
    telephone: body.telephone?.trim() || null,
    payload: {
      prenom,
      nom: body.nom?.trim() || '',
      stage,
      message: body.message || '',
      interets: body.interets || [],
      pays: body.pays?.trim() || '',
    },
  })

  // Parcours d'intégration (1 par membre/plateforme) — upsert des jalons.
  if (memberId && platformId) {
    const flags = journeyFlagsForStage(stage)
    await db.from('integration_journeys')
      .upsert({ member_id: memberId, platform_id: platformId, ...flags }, { onConflict: 'member_id,platform_id' })
  }

  return { isNew }
}

export async function POST(req: NextRequest) {
  // Anti-spam : 6 soumissions / 10 min / IP (protège la base, le quota Resend et FluentCRM).
  const rl = rateLimit(`tunnel-lead:${clientIp(req)}`, { limit: 6, windowMs: 10 * 60 * 1000 })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, delivered: false, message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  let body: IncomingLead
  try {
    body = (await req.json()) as IncomingLead
  } catch {
    return NextResponse.json(
      { ok: false, delivered: false, message: 'Requête invalide.' },
      { status: 400 },
    )
  }

  const prenom = (body.prenom ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const stage = body.stage && TUNNEL_BY_KEY[body.stage] ? body.stage : 'contact'

  if (!prenom || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, delivered: false, message: 'Prénom et email valides requis.' },
      { status: 422 },
    )
  }

  // Persistance Supabase (best-effort) — alimente le dashboard. Ne bloque jamais.
  let isNewContact = false
  try {
    const r = await persistLead(body, prenom, email, stage)
    isNewContact = r.isNew
  } catch (err) {
    console.error('[tunnel/lead] persistance Supabase échouée', err)
  }

  // Étape 1 du tunnel — email de bienvenue (fallback Resend, indépendant de
  // FluentCRM). Best-effort, uniquement pour un NOUVEAU contact, jamais bloquant.
  if (isNewContact && !IS_DEMO_MODE) {
    try {
      const { subject, html } = welcomeEmail(prenom)
      await sendEmail({ to: email, subject, html })
    } catch (err) {
      console.error('[tunnel/lead] envoi email bienvenue échoué', err)
    }
  }

  const baseUrl = process.env.FLUENTCRM_BASE_URL
  const username = process.env.FLUENTCRM_USERNAME
  const password = process.env.FLUENTCRM_PASSWORD
  const listId = process.env.FLUENTCRM_LIST_ID

  // Mode démo : pas de credentials → on accepte sans relayer (UX intacte).
  if (!baseUrl || !username || !password) {
    return NextResponse.json({
      ok: true,
      delivered: false,
      message: 'Reçu (mode démo — FluentCRM non configuré).',
    })
  }

  const tag = TUNNEL_BY_KEY[stage].crmTag
  const auth = Buffer.from(`${username}:${password}`).toString('base64')

  // FluentCRM REST : POST /wp-json/fluent-crm/v2/subscribers
  // (crée ou met à jour selon l'email, applique tags + listes)
  const payload: Record<string, unknown> = {
    first_name: prenom,
    last_name: body.nom?.trim() || '',
    email,
    phone: body.telephone?.trim() || '',
    country: body.pays?.trim() || '',
    status: 'subscribed',
    tags: [tag, `source:${body.source || stage}`],
    ...(listId ? { lists: [Number(listId)] } : {}),
    ...(body.message || body.interets?.length
      ? {
          custom_values: {
            message: body.message || '',
            interets: (body.interets || []).join(', '),
          },
        }
      : {}),
  }

  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, '')}/wp-json/fluent-crm/v2/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(payload),
      },
    )

    if (!res.ok) {
      // On ne bloque pas l'utilisateur : on logge et on renvoie un succès doux.
      console.error('[tunnel/lead] FluentCRM a répondu', res.status)
      return NextResponse.json({
        ok: true,
        delivered: false,
        message: 'Reçu. Notre équipe vous recontacte très vite.',
      })
    }

    return NextResponse.json({
      ok: true,
      delivered: true,
      message: 'Bienvenue ! Votre demande a bien été enregistrée.',
    })
  } catch (err) {
    console.error('[tunnel/lead] erreur réseau FluentCRM', err)
    return NextResponse.json({
      ok: true,
      delivered: false,
      message: 'Reçu. Notre équipe vous recontacte très vite.',
    })
  }
}

/**
 * ÉMETTEURS SÉMANTIQUES — un point d'entrée par événement métier.
 * Construisent une intention et la diffusent via le moteur à canaux (channels.ts).
 * Centralise titres/href/type → aucun string éparpillé dans les routes.
 * Tous NON bloquants (l'action métier ne doit jamais échouer à cause d'une notif).
 */
import { supabaseAdmin } from '@/lib/supabase'
import { dispatch } from './channels'
import { alertLevel, dedupKeys, monthBucket } from './rules'

// ── Notifications MEMBRE (événementielles) ──────────────────────────────────

export async function notifyModuleCompleted(userId: string, p: { moduleTitre?: string; formationTitre?: string; slug?: string }) {
  await dispatch({ target: { userId }, type: 'formation', title: 'Module terminé ✅',
    body: [p.moduleTitre, p.formationTitre].filter(Boolean).join(' — ') || 'Un module est validé',
    href: p.slug ? `/member/dashboard/formations/${p.slug}` : '/member/dashboard/formations' })
}

export async function notifyParcoursCompleted(userId: string, p: { formationTitre?: string; slug?: string }) {
  await dispatch({ target: { userId }, type: 'formation', title: 'Parcours terminé 🎉',
    body: p.formationTitre || 'Félicitations pour ce parcours',
    href: p.slug ? `/member/dashboard/formations/${p.slug}` : '/member/dashboard/formations' })
}

export async function notifyCertificate(userId: string, p: { titre?: string; reference?: string | null }) {
  await dispatch({ target: { userId }, type: 'formation', title: 'Certificat obtenu 🏅',
    body: p.titre || 'Votre certificat est disponible',
    href: p.reference ? `/certificat/${encodeURIComponent(p.reference)}` : '/member/dashboard/formations',
    dedupKey: p.reference ? dedupKeys.certificate(p.reference) : undefined,
    channels: ['in_app', 'email'] })
}

export async function notifyAcademieUnlocked(userId: string) {
  await dispatch({ target: { userId }, type: 'formation', title: 'Académie des Élus débloquée 👑',
    body: "Votre Programme d'Intégration est complet — l'Académie vous est ouverte.",
    href: '/member/dashboard/formations', dedupKey: `academie_unlocked:${userId}` })
}

export async function notifyStatusReached(userId: string, p: { statut?: string }) {
  await dispatch({ target: { userId }, type: 'membre', title: 'Nouvelle étape spirituelle 🌱',
    body: p.statut ? `Vous êtes désormais : ${String(p.statut).replace(/_/g, ' ')}` : 'Votre statut a évolué',
    href: '/member/dashboard/parcours' })
}

export async function notifyResponsableAssigned(userId: string, p: { responsableNom?: string }) {
  await dispatch({ target: { userId }, type: 'membre', title: 'Un responsable vous accompagne 🤝',
    body: p.responsableNom ? `${p.responsableNom} suit désormais votre parcours.` : 'Un responsable de suivi vous a été assigné.',
    href: '/member/dashboard/parcours' })
}

export async function notifyNextStep(userId: string, p: { label: string; href?: string }) {
  await dispatch({ target: { userId }, type: 'systeme', title: 'Votre prochaine étape', body: p.label,
    href: p.href || '/member/dashboard/parcours' })
}

export async function notifyWelcome(userId: string, p: { prenom?: string }) {
  await dispatch({ target: { userId }, type: 'systeme', title: `Bienvenue dans la Citadelle${p.prenom ? ', ' + p.prenom : ''} 🕊️`,
    body: "Commencez votre parcours d'intégration — pas à pas.",
    href: '/member/dashboard/parcours', dedupKey: dedupKeys.welcome(userId),
    channels: ['in_app', 'email'] })
}

export async function notifyPrayerStatus(userId: string, p: { sujet?: string; statut?: string }) {
  const title = p.statut === 'en_priere' ? 'Votre demande est prise en charge 🙏'
    : ['traitee', 'reponse_recue', 'temoignage_valide'].includes(String(p.statut)) ? 'Une réponse à votre demande 🙏'
    : 'Suivi de votre demande de prière'
  await dispatch({ target: { userId }, type: 'priere', title, body: p.sujet || '', href: '/member/dashboard/prieres' })
}

export async function notifyCertificatePending(userId: string, p: { titre?: string; reference?: string | null }) {
  await dispatch({ target: { userId }, type: 'formation', title: 'Votre certificat vous attend 🎓',
    body: p.titre || 'Récupérez votre certificat',
    href: p.reference ? `/certificat/${encodeURIComponent(p.reference)}` : '/member/dashboard/formations',
    dedupKey: p.reference ? `certpending:${p.reference}` : undefined })
}

// ── Alertes PASTORALES (persistées + responsable prioritaire + supervision admin) ──

export async function raisePastoralAlert(opts: {
  memberId: string; type: string; title: string; body?: string; href?: string; detail?: Record<string, unknown>; nowMs?: number
}): Promise<void> {
  const now = opts.nowMs ?? Date.now()
  const bucket = monthBucket(now)

  let responsable_id: string | null = null
  try {
    const { data } = await supabaseAdmin.from('profiles').select('berger_id').eq('id', opts.memberId).maybeSingle()
    responsable_id = (data as any)?.berger_id ?? null
  } catch { /* */ }

  // Une seule alerte OUVERTE par (membre, type) — pas de doublon.
  try {
    const { data: existing } = await supabaseAdmin.from('pastoral_alerts')
      .select('id').eq('member_id', opts.memberId).eq('type', opts.type).neq('status', 'resolue').limit(1).maybeSingle()
    if (!existing) {
      await supabaseAdmin.from('pastoral_alerts').insert({
        member_id: opts.memberId, responsable_id, type: opts.type, level: alertLevel(opts.type),
        escalation_level: responsable_id ? 'responsable' : 'admin', detail: opts.detail ?? {},
      })
    }
  } catch { /* non bloquant */ }

  // Notification : responsable de proximité (prioritaire) + supervision admin.
  const dk = dedupKeys.pastoral(opts.type, opts.memberId, bucket)
  const href = opts.href || `/admin/membres/${opts.memberId}`
  if (responsable_id) await dispatch({ target: { userId: responsable_id }, type: 'membre', title: opts.title, body: opts.body, href, dedupKey: dk })
  await dispatch({ target: { audience: 'admin' }, type: 'systeme', title: opts.title, body: opts.body, href, dedupKey: dk })
}

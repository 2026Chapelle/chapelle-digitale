import 'server-only'
import { emailLayout, escapeHtml } from '@/lib/email'
import { siteUrl } from '@/lib/site-url'

/**
 * Bibliothèque de courriels transactionnels de la Citadelle.
 *
 * Chaque fonction renvoie `{ subject, html }` prêt pour `sendEmail()`.
 * Identité visuelle commune via `emailLayout`. Aucun contenu fictif : les
 * valeurs proviennent toujours d'un événement réel (inscription, prière, don…).
 */

export interface BuiltEmail {
  subject: string
  html: string
}

const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`

/** Étape 1 du tunnel : courriel de bienvenue à l'arrivée d'un nouveau contact. */
export function welcomeEmail(prenom: string): BuiltEmail {
  const name = escapeHtml(prenom || 'Bien-aimé(e)')
  return {
    subject: 'Bienvenue dans la Citadelle du Royaume 🕊️',
    html: emailLayout({
      title: `Bienvenue, ${name} !`,
      preheader: 'Votre place dans la famille du Royaume vous attend.',
      body:
        p(`Bonjour <strong>${name}</strong>,`) +
        p(`Quelle joie de vous accueillir dans la <strong>Chapelle Internationale des Élus du Royaume</strong>. Vous n'êtes pas un numéro : vous êtes attendu(e), connu(e) et aimé(e).`) +
        p(`Voici vos premiers pas pour vous sentir chez vous :`) +
        `<ul style="margin:0 0 16px;padding-left:20px">
           <li style="margin-bottom:6px">Découvrez nos <strong>cultes en direct</strong> et enseignements</li>
           <li style="margin-bottom:6px">Rejoignez une <strong>famille / cellule</strong> proche de vous</li>
           <li style="margin-bottom:6px">Commencez votre <strong>parcours d'intégration</strong></li>
         </ul>` +
        p(`Notre équipe d'accueil vous accompagne personnellement. Répondez simplement à ce message si vous avez la moindre question.`),
      cta: { label: 'Commencer mon intégration', href: siteUrl('/integration') },
    }),
  }
}

/** Confirmation d'inscription à un événement. */
export function eventRegistrationEmail(prenom: string, eventTitle: string, dateLabel?: string): BuiltEmail {
  const name = escapeHtml(prenom || 'Bien-aimé(e)')
  const title = escapeHtml(eventTitle)
  return {
    subject: `Inscription confirmée — ${title}`,
    html: emailLayout({
      title: 'Votre inscription est confirmée ✓',
      preheader: `Rendez-vous à : ${title}`,
      body:
        p(`Bonjour <strong>${name}</strong>,`) +
        p(`Votre inscription à <strong>${title}</strong>${dateLabel ? ` (${escapeHtml(dateLabel)})` : ''} est bien enregistrée.`) +
        p(`Nous avons hâte de vivre ce moment avec vous. Vous recevrez un rappel avant l'événement.`),
      cta: { label: 'Voir l\'agenda', href: siteUrl('/evenements') },
    }),
  }
}

/** Accusé de réception d'une demande de prière. */
export function prayerReceivedEmail(prenom: string, sujet: string, reference?: string): BuiltEmail {
  const name = escapeHtml(prenom || 'Bien-aimé(e)')
  return {
    subject: 'Votre demande de prière a été reçue 🙏',
    html: emailLayout({
      title: 'Nous prions pour vous',
      preheader: 'Votre requête est entre les mains de nos intercesseurs.',
      body:
        p(`Bonjour <strong>${name}</strong>,`) +
        p(`Nous avons bien reçu votre demande de prière${sujet ? ` au sujet de « <em>${escapeHtml(sujet)}</em> »` : ''}.`) +
        p(`Elle est désormais confiée à l'équipe d'intercession de <strong>Mahanaïm</strong>. Vous n'êtes pas seul(e) : nous portons cette requête devant Dieu.`) +
        (reference ? p(`Référence de suivi : <strong>${escapeHtml(reference)}</strong>`) : ''),
      cta: { label: 'Accéder au mur de prière', href: siteUrl('/priere') },
    }),
  }
}

/** Notification à un intercesseur lorsqu'une demande lui est assignée. */
export function prayerAssignedEmail(intercesseur: string, sujet: string, reference?: string): BuiltEmail {
  const name = escapeHtml(intercesseur || 'Bien-aimé(e)')
  return {
    subject: 'Une demande de prière vous est confiée',
    html: emailLayout({
      title: 'Nouvelle assignation de prière',
      body:
        p(`Bonjour <strong>${name}</strong>,`) +
        p(`Une demande de prière vous a été assignée${sujet ? ` : « <em>${escapeHtml(sujet)}</em> »` : ''}.`) +
        (reference ? p(`Référence : <strong>${escapeHtml(reference)}</strong>`) : '') +
        p(`Merci de la prendre en charge dans la prière et d'enregistrer votre suivi dans le Centre de prière.`),
      cta: { label: 'Ouvrir le Centre de prière', href: siteUrl('/admin/prieres') },
    }),
  }
}

/** Confirmation au membre lorsqu'une réponse / un exaucement est enregistré. */
export function prayerAnsweredEmail(prenom: string, sujet: string): BuiltEmail {
  const name = escapeHtml(prenom || 'Bien-aimé(e)')
  return {
    subject: 'Une nouvelle au sujet de votre prière ✨',
    html: emailLayout({
      title: 'Dieu est fidèle',
      body:
        p(`Bonjour <strong>${name}</strong>,`) +
        p(`Concernant votre demande${sujet ? ` « <em>${escapeHtml(sujet)}</em> »` : ''}, nous avons une nouvelle à partager avec vous.`) +
        p(`Si Dieu a répondu, nous serions honorés que vous partagiez votre <strong>témoignage</strong> pour encourager toute la communauté.`),
      cta: { label: 'Partager mon témoignage', href: siteUrl('/member/dashboard/prieres') },
    }),
  }
}

/** Confirmation au témoin lorsque son témoignage est validé et publié. */
export function testimonyValidatedEmail(prenom: string, titre?: string): BuiltEmail {
  const name = escapeHtml(prenom || 'Bien-aimé(e)')
  return {
    subject: 'Votre témoignage est publié 🎉',
    html: emailLayout({
      title: 'Merci pour votre témoignage',
      body:
        p(`Bonjour <strong>${name}</strong>,`) +
        p(`Votre témoignage${titre ? ` « <em>${escapeHtml(titre)}</em> »` : ''} a été validé et est désormais <strong>publié</strong> sur la plateforme.`) +
        p(`Votre histoire va fortifier la foi de beaucoup. Merci de rendre gloire à Dieu avec nous !`),
      cta: { label: 'Voir les témoignages', href: siteUrl('/temoignages') },
    }),
  }
}

/** Reçu / remerciement premium après un don (status=complete). */
export function donationReceiptEmail(opts: {
  prenom: string
  montant?: string      // ex. "5 000 FCFA" (déjà formaté)
  reference?: string
  date?: string
  methode?: string      // ex. "Chariow"
}): BuiltEmail {
  const name = escapeHtml(opts.prenom || 'Cher partenaire')
  const montant = escapeHtml(opts.montant || '')
  const reference = escapeHtml(opts.reference || '')
  const date = escapeHtml(opts.date || '')
  const methode = escapeHtml(opts.methode || 'Chariow')

  const gold = '#D4AF37', pearl = 'rgba(245,243,238,0.85)', muted = 'rgba(245,243,238,0.55)'
  const btn = (label: string, href: string, primary = false) =>
    `<a href="${href}" style="display:inline-block;margin:4px 6px 4px 0;padding:11px 22px;border-radius:9999px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;${primary ? `background:${gold};color:#1A0F00` : `background:rgba(255,255,255,0.06);color:${gold};border:1px solid ${gold}55`}">${label}</a>`

  const ligne = (k: string, v: string) =>
    `<tr><td style="padding:5px 0;color:${muted};font-size:13px">${k}</td><td style="padding:5px 0;text-align:right;color:${pearl};font-size:13px"><strong>${v}</strong></td></tr>`

  return {
    subject: '🙏 Merci pour votre générosité – Chapelle Royale',
    html: emailLayout({
      title: 'Merci pour votre générosité',
      preheader: `Reçu ${reference || ''} — votre offrande a bien été reçue.`,
      body:
        p(`Cher(e) <strong>${name}</strong>,`) +
        p(`Nous vous remercions pour votre offrande de <strong>${montant}</strong>.`) +
        p(`Votre contribution participe directement à :`) +
        `<ul style="margin:0 0 16px;padding-left:20px;color:${pearl};font-size:14px;line-height:1.8">
           <li>l'évangélisation digitale</li>
           <li>la formation des disciples</li>
           <li>les temps de prière et d'intercession</li>
           <li>l'accompagnement spirituel des nations</li>
         </ul>` +
        // Bloc reçu
        `<table role="presentation" width="100%" style="border-top:1px solid rgba(255,255,255,0.1);border-bottom:1px solid rgba(255,255,255,0.1);margin:6px 0 18px">
           <tr><td colspan="2" style="padding:10px 0 4px;color:${gold};font-family:Georgia,serif;font-size:13px;letter-spacing:1px">Reçu N° ${reference}</td></tr>
           ${ligne('Nom', name)}
           ${ligne('Montant', montant)}
           ${ligne('Date', date)}
           ${ligne('Référence Chariow', reference)}
           ${ligne('Mode de paiement', methode)}
         </table>` +
        // Écriture
        `<div style="margin:0 0 16px;padding:14px 18px;background:rgba(212,175,55,0.08);border-left:3px solid ${gold};border-radius:8px">
           <div style="color:${gold};font-size:12px;font-weight:700;margin-bottom:4px">📖 Luc 6:38</div>
           <div style="color:${pearl};font-style:italic;font-family:Georgia,serif;font-size:15px">« Donnez, et il vous sera donné. »</div>
         </div>` +
        p(`Nous prions que le Seigneur vous bénisse, vous établisse, et multiplie les œuvres de vos mains.`) +
        `<p style="margin:0 0 18px;color:${pearl};font-size:14px;line-height:1.6">
           <strong>Rev. Doxa Salomon</strong><br>
           <span style="color:${muted}">Pasteur Fondateur</span><br>
           <span style="color:${muted}">La Chapelle Internationale des Élus du Royaume</span>
         </p>` +
        // Boutons
        `<div style="margin:6px 0 4px">
           ${btn('Voir mes dons', siteUrl('/member/dashboard/dons'), true)}
           ${btn('Rejoindre nos directs', 'https://youtube.com/@ChapelleRoyaleTV')}
           ${btn('Visiter la plateforme', 'https://chapelleduroyaume.org')}
         </div>`,
    }),
  }
}

/**
 * CITADELLE LIVING BOOKS — LB-SEC : Lecture GATÉE par identité canonique : /lecture/pdf/[id]
 *
 * Server Component. Résout l'ACCÈS côté serveur (identité vérifiée + décision pure
 * `decideDocumentAccess` + entitlement Premium réel), PUIS ne délègue au lecteur
 * que si autorisé — avec une URL de lecture SIGNÉE (objet Storage privé) plutôt
 * qu'une URL publique durable. Un contenu non autorisé ne reçoit JAMAIS d'URL.
 *
 * PDF-2 servait ici l'URL publique du document sans contrôle (access_level =
 * éditorial). LB-SEC ferme cette fuite au niveau applicatif : la protection réelle
 * des octets vient du bucket privé `documents` + URL signée (identité de stockage
 * = storage_bucket/storage_path, `cms_media.url` vide pour les documents privés).
 *
 * Le fallback historique /lecture/pdf?src=&title= (PDF-1) reste inchangé.
 */
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerProfile } from '@/lib/supabase-server'
import { getDocumentDelivery } from '@/lib/documents/document-delivery-server'
import { isMemberStatus, hasBooksPremiumAccess } from '@/lib/documents/document-delivery'
import { PdfDocumentReader } from '@/components/pdf/PdfDocumentReader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

/** Écran plein (même charte que l'écran « Document introuvable » de PDF-2). */
function ReaderNotice({
  title,
  message,
  ctaHref,
  ctaLabel,
}: {
  title: string
  message: string
  ctaHref: string
  ctaLabel: string
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ background: '#050308' }}
    >
      <p className="font-cinzel text-pearl text-lg">{title}</p>
      <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>
        {message}
      </p>
      <Link href={ctaHref} className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-2">
        {ctaLabel}
      </Link>
    </div>
  )
}

export default async function LecturePdfByIdPage({ params }: { params: { id: string } }) {
  const profile = await getServerProfile()
  const authenticated = Boolean(profile)
  const role = typeof (profile as { role?: unknown } | null)?.role === 'string' ? (profile as { role: string }).role : ''
  const isAdmin = ADMIN_ROLES.has(role)
  const isMember = isMemberStatus((profile as { membre_statut?: unknown } | null)?.membre_statut)
  const uid = typeof (profile as { id?: unknown } | null)?.id === 'string' ? (profile as { id: string }).id : null
  const hasPremiumEntitlement = authenticated ? await hasBooksPremiumAccess(supabaseAdmin, uid) : false

  const delivery = await getDocumentDelivery(params.id, {
    authenticated,
    isMember,
    isAdmin,
    hasPremiumEntitlement,
  })

  if (!delivery.allowed || !delivery.url) {
    switch (delivery.reason) {
      case 'auth_required':
        return (
          <ReaderNotice
            title="Connexion requise"
            message="Ce document est réservé aux membres. Connectez-vous pour y accéder."
            ctaHref="/login"
            ctaLabel="Se connecter"
          />
        )
      case 'member_only':
        return (
          <ReaderNotice
            title="Réservé aux membres"
            message="Ce document est réservé aux membres de la Citadelle."
            ctaHref="/rejoindre"
            ctaLabel="Rejoindre la Citadelle"
          />
        )
      case 'premium_denied':
        return (
          <ReaderNotice
            title="Contenu Premium"
            message="Ce document est réservé aux membres disposant d’un accès Premium."
            ctaHref="/member/dashboard/ressources"
            ctaLabel="Retour à la bibliothèque"
          />
        )
      default:
        return (
          <ReaderNotice
            title="Document introuvable"
            message="Ce document n’existe pas, n’est pas publié, ou n’a pas de fichier associé."
            ctaHref="/member/dashboard/ressources"
            ctaLabel="Retour à la bibliothèque"
          />
        )
    }
  }

  return <PdfDocumentReader src={delivery.url} title={delivery.title} downloadUrl={delivery.url} />
}

/**
 * CITADELLE PDF-2 — Lecture par IDENTITÉ CANONIQUE : /lecture/pdf/[id]
 *
 * Server Component : résout le document PDF PUBLIÉ (cms_media, type='pdf',
 * status='published') via la service role, PUIS délègue au wrapper client
 * (PdfReader inchangé, monté en ssr:false). L'identité = id (uuid), jamais l'URL
 * du fichier — le lien est propre et partageable, et sert de point d'ancrage au
 * futur gate d'accès (PDF-3 : bucket privé + URL signée + has_entitlement).
 *
 * Le fallback historique /lecture/pdf?src=&title= (PDF-1) reste inchangé.
 * Filtre status='published' RÉAPPLIQUÉ ici (ne jamais exposer un brouillon).
 */
import Link from 'next/link'
import { getPublishedPdfDocumentById } from '@/lib/pdf/documents-server'
import { resolveDocumentSource } from '@/lib/pdf/document-model'
import { PdfDocumentReader } from '@/components/pdf/PdfDocumentReader'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function LecturePdfByIdPage({ params }: { params: { id: string } }) {
  const doc = await getPublishedPdfDocumentById(params.id)
  const src = resolveDocumentSource(doc)

  if (!doc || !src) {
    return (
      <div
        className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: '#050308' }}
      >
        <p className="font-cinzel text-pearl text-lg">Document introuvable</p>
        <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.5)' }}>
          Ce document n’existe pas ou n’est pas publié.
        </p>
        <Link
          href="/member/dashboard/ressources"
          className="btn-gold text-sm px-4 py-2 inline-flex items-center gap-2"
        >
          Retour à la bibliothèque
        </Link>
      </div>
    )
  }

  return <PdfDocumentReader src={src} title={doc.title} downloadUrl={src} />
}

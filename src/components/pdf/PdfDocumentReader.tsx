'use client'
/**
 * CITADELLE PDF-2 — Frontière CLIENT pour la lecture par documentId.
 *
 * La route serveur /lecture/pdf/[id] résout le document canonique (cms_media)
 * puis délègue le rendu à ce wrapper : il monte le lecteur PDF-1 (PdfReader,
 * INCHANGÉ) en dynamic ssr:false (pdf.js hors bundle initial, jamais côté serveur).
 */
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const PdfReader = dynamic(() => import('./PdfReader').then((m) => m.PdfReader), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center"
      style={{ background: 'rgba(5,3,8,0.92)' }}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '3px solid rgba(212,175,55,0.25)',
          borderTopColor: '#D4AF37',
          animation: 'pdf-spin 0.8s linear infinite',
        }}
      />
      <span className="sr-only">Ouverture du lecteur…</span>
      <style>{`@keyframes pdf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ),
})

export interface PdfDocumentReaderProps {
  src: string
  title?: string
  downloadUrl?: string | null
  /** Identifiant STABLE du document (≠ URL signée) pour la reprise locale LB-1. */
  storageId?: string
  /** Route de repli si l'historique est vide. */
  backHref?: string
}

export function PdfDocumentReader({
  src,
  title,
  downloadUrl,
  storageId,
  backHref = '/member/dashboard/ressources',
}: PdfDocumentReaderProps) {
  const router = useRouter()
  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push(backHref)
  }
  return (
    <PdfReader src={src} title={title} downloadUrl={downloadUrl} storageId={storageId} variant="overlay" onClose={goBack} />
  )
}

export default PdfDocumentReader

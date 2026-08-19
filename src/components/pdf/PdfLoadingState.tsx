'use client'
/**
 * CITADELLE PDF-1 — État de chargement du lecteur (« Ouverture du document… »).
 * Spinner + squelette sobres, jamais d'écran blanc sans explication.
 */
export interface PdfLoadingStateProps {
  title?: string
}

export function PdfLoadingState({ title }: PdfLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ minHeight: 240 }}
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
      <div>
        <p className="font-cinzel text-pearl text-base">Ouverture du document…</p>
        {title && (
          <p className="font-inter text-xs mt-1" style={{ color: 'rgba(245,230,216,0.5)' }}>
            {title}
          </p>
        )}
      </div>
      <style>{`@keyframes pdf-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

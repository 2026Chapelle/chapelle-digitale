'use client'
/**
 * Embarque un Fluent Form natif (hébergé sur WordPress) via iframe.
 *
 * Deux stratégies d'intégration des formulaires sont prévues :
 *   1. <TunnelLeadForm/>  → formulaire React natif → /api/tunnel/lead → FluentCRM
 *      (recommandé : design 100 % cohérent, pas de dépendance front WP).
 *   2. <FluentEmbed/>     → iframe vers une page WordPress contenant le
 *      shortcode [fluentform id="X"] (utile si l'équipe gère les champs
 *      directement dans Fluent Forms).
 *
 * Renseigner l'URL via la prop `src` ou NEXT_PUBLIC_FLUENTFORM_BASE.
 */
interface FluentEmbedProps {
  /** URL complète de la page WP qui rend le Fluent Form. */
  src?: string
  /** id du Fluent Form (concaténé à NEXT_PUBLIC_FLUENTFORM_BASE si src absent). */
  formId?: string | number
  title?: string
  height?: number
  className?: string
}

export function FluentEmbed({
  src,
  formId,
  title = 'Formulaire CIER',
  height = 620,
  className,
}: FluentEmbedProps) {
  const base = process.env.NEXT_PUBLIC_FLUENTFORM_BASE
  const url = src || (base && formId ? `${base.replace(/\/$/, '')}/form/${formId}` : null)

  if (!url) {
    return (
      <div
        className={className}
        style={{
          borderRadius: '1rem',
          border: '1px dashed rgba(212,175,55,0.3)',
          background: 'rgba(255,255,255,0.02)',
          padding: '2rem',
          textAlign: 'center',
          color: 'rgba(245,230,216,0.45)',
          fontSize: 13,
        }}
      >
        Fluent Form non configuré — définir <code>NEXT_PUBLIC_FLUENTFORM_BASE</code> + <code>formId</code>,
        ou utiliser le formulaire React natif.
      </div>
    )
  }

  return (
    <iframe
      src={url}
      title={title}
      loading="lazy"
      className={className}
      style={{
        width: '100%',
        height,
        border: '1px solid rgba(212,175,55,0.15)',
        borderRadius: '1rem',
        background: 'transparent',
      }}
    />
  )
}

'use client'
/**
 * Composants DONS & OFFRANDES côté public.
 *
 * Branding : aucun « Chariow » visible. On affiche « Don volontaire »,
 * « Offrande », « Soutenir l'œuvre », « Partenariat », « Accès au parcours ».
 *
 * Deux modes :
 *   1. <GivingButton>  → bouton/lien direct (fiable, toujours fonctionnel, sur
 *      la charte du site). C'est le mode par défaut et le fallback.
 *   2. <ChariowEmbed>  → monte le widget officiel (data-attributes) + charge le
 *      script. Si le widget ne se charge pas, le lien direct reste affiché.
 *
 * Aucune donnée bancaire ne transite ici : le paiement se déroule chez Chariow.
 */
import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import type { GivingProduct, GivingWidgetSettings } from '@/lib/giving'
import { GIVING_WIDGET_DEFAULTS } from '@/lib/giving'

/** Injecte une seule fois le script + la CSS du widget de paiement. */
export function loadGivingScript(settings: Partial<GivingWidgetSettings> = {}) {
  if (typeof document === 'undefined') return
  const scriptUrl = settings.script_url || GIVING_WIDGET_DEFAULTS.script_url
  const cssUrl = settings.css_url || GIVING_WIDGET_DEFAULTS.css_url
  if (cssUrl && !document.querySelector(`link[href="${cssUrl}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = cssUrl
    document.head.appendChild(link)
  }
  if (scriptUrl && !document.querySelector(`script[src="${scriptUrl}"]`)) {
    const s = document.createElement('script')
    s.src = scriptUrl
    s.async = true
    document.body.appendChild(s)
  }
}

/** Log analytique non-bloquant (vue / clic). Aucune donnée bancaire. */
function logGiving(product: GivingProduct, event_type: 'view' | 'click') {
  try {
    navigator.sendBeacon?.(
      '/api/giving/log',
      new Blob([JSON.stringify({
        product_slug: product.slug,
        chariow_product_id: product.product_id,
        event_type,
      })], { type: 'application/json' }),
    )
  } catch { /* silencieux */ }
}

interface ButtonProps {
  product: GivingProduct
  className?: string
  full?: boolean
}

/** Bouton de soutien fiable (lien direct, nouvel onglet). */
export function GivingButton({ product, className, full }: ButtonProps) {
  const href = product.direct_url || '#'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logGiving(product, 'click')}
      className={
        className ??
        `inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-inter text-sm font-bold transition-all hover:-translate-y-0.5 ${full ? 'w-full' : ''}`
      }
      style={
        className
          ? undefined
          : { background: `linear-gradient(135deg, ${product.button_color}, ${product.button_color}cc)`, color: '#1A0F00' }
      }
    >
      {product.button_label}
      <ArrowRight className="w-4 h-4" />
    </a>
  )
}

interface EmbedProps {
  product: GivingProduct
  settings?: Partial<GivingWidgetSettings>
}

/**
 * Monte le widget officiel (data-attributes). Charge le script si besoin.
 * Le lien direct reste rendu en dessous comme fallback garanti.
 */
export function ChariowEmbed({ product, settings = {} }: EmbedProps) {
  const ref = useRef<HTMLDivElement>(null)
  const store = settings.store_domain || GIVING_WIDGET_DEFAULTS.store_domain
  const primary = settings.primary_color || GIVING_WIDGET_DEFAULTS.primary_color
  const background = settings.background_color || GIVING_WIDGET_DEFAULTS.background_color
  const locale = settings.locale || GIVING_WIDGET_DEFAULTS.locale

  useEffect(() => {
    loadGivingScript(settings)
    logGiving(product, 'view')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id])

  if (!product.product_id) {
    // Pas d'ID widget → uniquement le lien direct
    return <GivingButton product={product} full />
  }

  return (
    <div>
      <div
        ref={ref}
        id="chariow-widget"
        data-product-id={product.product_id}
        data-store-domain={store}
        data-style={product.widget_style || 'tap'}
        data-border-style="rounded"
        data-cta-width="xs"
        data-cta-animation="none"
        data-locale={locale}
        data-primary-color={primary}
        data-background-color={background}
        data-custom-cta-text={product.button_label}
      />
      {/* Fallback TOUJOURS VISIBLE : si le widget tarde/échoue (réseau mobile,
          script bloqué), l'utilisateur garde un lien direct fonctionnel. */}
      <a
        href={product.direct_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => logGiving(product, 'click')}
        className="mt-2 block text-center text-xs font-inter text-gold/70 underline underline-offset-2 hover:text-gold"
      >
        Le bouton ne s’affiche pas ? Donnez via le lien direct →
      </a>
    </div>
  )
}

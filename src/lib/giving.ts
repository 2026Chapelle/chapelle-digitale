/**
 * Couche DONS & OFFRANDES (Chariow) — lecture serveur avec fallback statique.
 *
 * IMPORTANT : Chariow n'est pas Stripe. Aucune logique de checkout ici, aucune
 * donnée bancaire. On ne fait que LIRE le catalogue de produits administrables
 * (table public.giving_products) pour afficher des widgets / liens Chariow.
 *
 * - Supabase configuré  → renvoie les produits actifs de la base.
 * - Supabase non configuré (démo) → renvoie le catalogue statique de secours
 *   (les 3 produits fournis), pour que le site public reste fonctionnel.
 *
 * SERVER-ONLY : importe `supabaseAdmin`. Les composants client passent par
 * l'API /api/giving/products. Les *types* peuvent être importés via `import type`.
 */
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'

export type GivingType = 'don' | 'offrande' | 'inscription' | 'acces' | 'partenariat'

export interface GivingProduct {
  id: string
  slug: string
  public_title: string
  public_description: string | null
  type: GivingType
  provider: string
  product_id: string | null
  direct_url: string | null
  button_label: string
  button_color: string
  widget_style: string
  page: string
  position: number
  is_active: boolean
}

export interface GivingWidgetSettings {
  store_domain: string
  script_url: string
  css_url: string
  locale: string
  primary_color: string
  background_color: string
}

/** Réglages par défaut du widget Chariow (secours hors-ligne / démo). */
export const GIVING_WIDGET_DEFAULTS: GivingWidgetSettings = {
  store_domain: 'zrqcqzjz.mychariow.shop',
  script_url: 'https://js.chariowcdn.com/v1/widget.min.js',
  css_url: 'https://js.chariowcdn.com/v1/widget.min.css',
  locale: 'fr',
  primary_color: '#FFCC00',
  background_color: '#FFFFFF',
}

/** Catalogue statique de secours — strictement aligné sur le seed SQL. */
export const GIVING_FALLBACK: GivingProduct[] = [
  {
    id: 'fallback-don-volontaire',
    slug: 'don-volontaire',
    public_title: 'Don volontaire',
    public_description: "Soutenez librement l'œuvre de la Citadelle du Royaume.",
    type: 'don',
    provider: 'chariow',
    product_id: 'prd_b0vay9',
    direct_url: 'https://zrqcqzjz.mychariow.shop/don-volontaire',
    button_label: 'Faire un don',
    button_color: '#D4AF37',
    widget_style: 'tap',
    page: 'dons',
    position: 0,
    is_active: true,
  },
  {
    id: 'fallback-destinee-acces',
    slug: 'destinee-acces',
    public_title: 'Accès au parcours',
    public_description: 'Accédez au parcours Destinée et engagez votre marche.',
    type: 'acces',
    provider: 'chariow',
    product_id: 'prd_ymoyd3',
    direct_url: 'https://chapelleduroyaume.org/destinee-acces/',
    button_label: 'Accéder au parcours',
    button_color: '#4B0082',
    widget_style: 'tap',
    page: 'destinee-acces',
    position: 0,
    is_active: true,
  },
  {
    id: 'fallback-couronne-dor',
    slug: 'couronne-dor',
    public_title: "Partenariat — Couronne d'or",
    public_description: 'Devenez partenaire bâtisseur du Royaume.',
    type: 'partenariat',
    provider: 'chariow',
    product_id: 'prd_w9h86o',
    direct_url: 'https://zrqcqzjz.mychariow.shop/couronne-dor',
    button_label: 'Devenir partenaire',
    button_color: '#D4AF37',
    widget_style: 'tap',
    page: 'partenariat',
    position: 0,
    is_active: true,
  },
]

/**
 * Produits actifs (optionnellement filtrés par page). Fallback statique si la
 * base n'est pas configurée ou indisponible.
 */
export async function getGivingProducts(page?: string): Promise<GivingProduct[]> {
  if (IS_DEMO_MODE) return filterByPage(GIVING_FALLBACK, page)
  try {
    let q = supabaseAdmin
      .from('giving_products')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })
    if (page) q = q.eq('page', page)
    const { data, error } = await q
    if (error || !data || data.length === 0) return filterByPage(GIVING_FALLBACK, page)
    return data as GivingProduct[]
  } catch {
    return filterByPage(GIVING_FALLBACK, page)
  }
}

/** Tous les produits (back-office, actifs + inactifs). */
export async function getAllGivingProducts(): Promise<GivingProduct[] | null> {
  if (IS_DEMO_MODE) return null
  try {
    const { data } = await supabaseAdmin
      .from('giving_products')
      .select('*')
      .order('page', { ascending: true })
      .order('position', { ascending: true })
    return (data as GivingProduct[]) ?? null
  } catch {
    return null
  }
}

/** Réglages globaux du widget (fallback défauts). */
export async function getGivingWidgetSettings(): Promise<GivingWidgetSettings> {
  if (IS_DEMO_MODE) return GIVING_WIDGET_DEFAULTS
  try {
    const { data } = await supabaseAdmin.from('giving_widget_settings').select('key, value')
    if (!data || data.length === 0) return GIVING_WIDGET_DEFAULTS
    const map: Record<string, any> = {}
    for (const row of data as any[]) map[row.key] = row.value
    return {
      store_domain: map.store_domain ?? GIVING_WIDGET_DEFAULTS.store_domain,
      script_url: map.script_url ?? GIVING_WIDGET_DEFAULTS.script_url,
      css_url: map.css_url ?? GIVING_WIDGET_DEFAULTS.css_url,
      locale: map.locale ?? GIVING_WIDGET_DEFAULTS.locale,
      primary_color: map.primary_color ?? GIVING_WIDGET_DEFAULTS.primary_color,
      background_color: map.background_color ?? GIVING_WIDGET_DEFAULTS.background_color,
    }
  } catch {
    return GIVING_WIDGET_DEFAULTS
  }
}

function filterByPage(list: GivingProduct[], page?: string): GivingProduct[] {
  if (!page) return list
  return list.filter((p) => p.page === page)
}

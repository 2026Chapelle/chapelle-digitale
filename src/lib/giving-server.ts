import 'server-only'

import { IS_DEMO_MODE } from '@/lib/supabase'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  filterGivingProductsByPage,
  GIVING_FALLBACK,
  GIVING_WIDGET_DEFAULTS,
  type GivingProduct,
  type GivingWidgetSettings,
} from '@/lib/giving'

/**
 * Produits actifs (optionnellement filtrés par page). Fallback statique si la
 * base n'est pas configurée ou indisponible.
 */
export async function getGivingProducts(page?: string): Promise<GivingProduct[]> {
  if (IS_DEMO_MODE) return filterGivingProductsByPage(GIVING_FALLBACK, page)
  try {
    let q = supabaseAdmin
      .from('giving_products')
      .select('*')
      .eq('is_active', true)
      .order('position', { ascending: true })
    if (page) q = q.eq('page', page)
    const { data, error } = await q
    if (error || !data || data.length === 0) return filterGivingProductsByPage(GIVING_FALLBACK, page)
    return data as GivingProduct[]
  } catch {
    return filterGivingProductsByPage(GIVING_FALLBACK, page)
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

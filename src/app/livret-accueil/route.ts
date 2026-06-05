import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { siteUrl } from '@/lib/site-url'
import { getSessionProfile } from '@/lib/member-auth'
import { logActivity } from '@/lib/activity'

/**
 * /livret-accueil — URL STABLE du Livret d'Accueil (anti-404).
 *
 * Réutilise le mécanisme existant : l'URL réelle du PDF vit dans
 * `cms_settings.livret_accueil_url` (réglée dans /admin/parametres, médiathèque).
 * On lit en service role (toujours autorisé) puis on redirige vers le PDF.
 * Si aucun livret n'est configuré, on redirige vers le parcours d'intégration
 * (où l'état « bientôt disponible » est déjà géré) plutôt que de renvoyer un 404.
 *
 * Ainsi tout lien `/livret-accueil` (email de bienvenue, bouton, partage)
 * fonctionne partout, sans coder l'URL en dur ni dupliquer le réglage admin.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const fallback = siteUrl('/member/dashboard/parcours')
  if (IS_DEMO_MODE) return NextResponse.redirect(fallback)
  try {
    const { data } = await supabaseAdmin.from('cms_settings')
      .select('value').eq('key', 'livret_accueil_url').maybeSingle()
    const v: any = data?.value
    let url = typeof v === 'string' ? v : (v && typeof v === 'object' && 'url' in v ? (v as any).url : null)
    if (url) {
      url = String(url).replace(/^"|"$/g, '').trim()
      if (/^https?:\/\//i.test(url)) {
        // Traçabilité RÉELLE du téléchargement — réutilise activity_logs / logActivity
        // (alimente statistiques, activités récentes et cockpit Super Admin).
        try {
          const sp = await getSessionProfile()
          const p: any = sp?.profile || {}
          await logActivity({
            userId: sp?.uid ?? null,
            nom: sp ? (`${p.prenom ?? ''} ${p.nom ?? ''}`.trim() || p.email || null) : null,
            email: p.email ?? null, pays: p.pays ?? null,
            action_type: 'pdf_download', resource_type: 'livret',
            resource_title: "Livret d'Accueil", source: 'livret',
          })
        } catch { /* non bloquant */ }
        return NextResponse.redirect(url)
      }
    }
  } catch { /* repli ci-dessous */ }
  return NextResponse.redirect(fallback)
}

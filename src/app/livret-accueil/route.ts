import { NextResponse } from 'next/server'
import { supabaseAdmin, IS_DEMO_MODE } from '@/lib/supabase'
import { siteUrl } from '@/lib/site-url'
import { getSessionProfile } from '@/lib/member-auth'
import { logActivity } from '@/lib/activity'
import { pickLivretTarget } from '@/lib/documents/livret-target'

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

/**
 * LB-SEC-2 : identité canonique du Livret d'Accueil (cms_media, type='pdf').
 * Défaut lorsque `cms_settings.livret_accueil_url` n'est pas configuré. On pointe
 * l'ID du document (JAMAIS une URL Storage) → le reader gaté /lecture/pdf/[id]
 * applique le contrôle d'accès + signe l'URL au moment de l'ouverture.
 */
export async function GET() {
  const fallback = siteUrl('/member/dashboard/parcours')
  if (IS_DEMO_MODE) return NextResponse.redirect(fallback)
  try {
    const { data } = await supabaseAdmin.from('cms_settings')
      .select('value').eq('key', 'livret_accueil_url').maybeSingle()
    const target = pickLivretTarget(data?.value)
    await traceLivret()
    return NextResponse.redirect(target.type === 'external' ? target.url : siteUrl(target.path))
  } catch { /* repli ci-dessous */ }
  return NextResponse.redirect(fallback)
}

/** Traçabilité RÉELLE du téléchargement — réutilise activity_logs / logActivity. */
async function traceLivret() {
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
}

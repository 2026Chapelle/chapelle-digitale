'use client'
import { usePathname } from 'next/navigation'
import { guideForPath } from '@/lib/help/guides'
import { HelpTooltip } from './HelpTooltip'

/**
 * Bulle d'aide CONTEXTUELLE flottante. Montée UNE seule fois dans le layout admin :
 * elle affiche le guide correspondant au chemin courant (ou rien). Non invasive,
 * ne touche aucune page métier.
 */
export function AdminHelpBubble() {
  const pathname = usePathname()
  const guide = guideForPath(pathname || '')
  if (!guide) return null
  return <HelpTooltip floating guideId={guide.id} title={guide.title} tip={guide.tip} />
}

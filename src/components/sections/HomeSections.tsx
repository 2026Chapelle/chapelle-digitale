import { cmsList, type CmsHomepageBlock } from '@/lib/cms'
import { HeroSection } from '@/components/sections/HeroSection'
import { PlatformsSection } from '@/components/sections/PlatformsSection'
import { ImpactSection } from '@/components/sections/ImpactSection'
import { LiveSection } from '@/components/sections/LiveSection'
import { FormationsSection } from '@/components/sections/FormationsSection'
import { TestimonialsSection } from '@/components/sections/TestimonialsSection'
import { PrayerSection } from '@/components/sections/PrayerSection'
import { JoinSection } from '@/components/sections/JoinSection'
import { PodcastSection } from '@/components/sections/PodcastSection'
import { SectionGlow } from '@/components/ui/SectionGlow'

/**
 * Accueil PILOTÉ PAR LE CMS (table cms_homepage_blocks).
 *
 * - Ordre  : chaque bloc a un `sort_order` modifiable en back-office.
 * - Visibilité : un bloc `is_active=false` ou non « published » est masqué.
 * - Contenu : titre/sous-titre/image/CTA passés à la section (override optionnel).
 * - Fallback : si aucune ligne CMS pour une section → contenu par défaut affiché
 *   (aucune régression en démo / avant configuration).
 *
 * Server component : lit le CMS côté serveur, rend des sections clientes animées.
 */

type Block = CmsHomepageBlock & {
  body?: string; image_url?: string; cta_label?: string; cta_href?: string; status?: string; sort_order?: number
}

const COMPONENTS: Record<string, (props: { block?: Block }) => JSX.Element> = {
  hero: HeroSection,
  live: LiveSection,
  platforms: PlatformsSection,
  impact: ImpactSection,
  formations: FormationsSection,
  prayer: PrayerSection,
  testimonials: TestimonialsSection,
  podcast: PodcastSection,
  join: JoinSection,
}

const DEFAULT_ORDER = ['hero', 'live', 'platforms', 'impact', 'formations', 'prayer', 'testimonials', 'podcast', 'join']

export async function HomeSections() {
  const rows = (await cmsList<Block>('cms_homepage_blocks')) ?? []
  const byKey: Record<string, Block> = {}
  for (const b of rows) byKey[b.block_key] = b

  const isVisible = (key: string) => {
    const b = byKey[key]
    if (!b) return true // pas de ligne CMS → section affichée par défaut
    if (b.is_active === false) return false
    return b.status ? b.status === 'published' : true
  }

  const ordered = DEFAULT_ORDER
    .map((key, i) => ({ key, order: byKey[key]?.sort_order ?? i }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.key)
    .filter((key) => COMPONENTS[key] && isVisible(key))

  return (
    <div className="bg-charbon relative">
      {ordered.map((key, i) => {
        const Section = COMPONENTS[key]
        return (
          <div key={key}>
            {i > 0 && <SectionGlow />}
            <Section block={byKey[key]} />
          </div>
        )
      })}
    </div>
  )
}

import { cmsList, type CmsHomepageBlock } from '@/lib/cms'
import { HeroSection } from '@/components/sections/HeroSection'
import { LiveSection } from '@/components/sections/LiveSection'
import { StartHereSection } from '@/components/sections/StartHereSection'
import { MovementSection } from '@/components/sections/MovementSection'
import { GrowSection } from '@/components/sections/GrowSection'
import { CommunitySection } from '@/components/sections/CommunitySection'
import { JoinSection } from '@/components/sections/JoinSection'
import { SectionGlow } from '@/components/ui/SectionGlow'
import { HomeJoinPopupLazy } from '@/components/home/HomeJoinPopupLazy'
import { FeaturedEventsSection } from '@/components/home/FeaturedEventsSection'
import { InstallCitadelleSection } from '@/components/home/InstallCitadelleSection'
import { GlobalPresenceSection } from '@/components/home/GlobalPresenceSection'

/**
 * Accueil PILOTÉ PAR LE CMS (table cms_homepage_blocks).
 *
 * Refonte premium — architecture en 7 blocs (audit homepage) :
 *   hero → live → start → movement → grow → community → join
 *   (fusions : Impact+Platforms→movement, Formations+Podcast→grow,
 *    Prière+Témoignages→community ; pricing retiré de l'accueil).
 *
 * - Ordre  : chaque bloc a un `sort_order` modifiable en back-office.
 * - Visibilité : un bloc `is_active=false` ou non « published » est masqué.
 * - Contenu : titre/sous-titre/image/CTA passés à la section (override optionnel).
 * - Fallback : si aucune ligne CMS pour une section → contenu par défaut affiché.
 *
 * Les anciennes clés (platforms, impact, formations, prayer, testimonials,
 * podcast) ne sont plus rendues : leurs blocs sont désormais fusionnés.
 *
 * Server component : lit le CMS côté serveur, rend des sections clientes animées.
 */

type Block = CmsHomepageBlock & {
  body?: string; image_url?: string; cta_label?: string; cta_href?: string; status?: string; sort_order?: number
}

const COMPONENTS: Record<string, (props: { block?: Block }) => JSX.Element> = {
  hero: HeroSection,
  live: LiveSection,
  start: StartHereSection,
  movement: MovementSection,
  grow: GrowSection,
  community: CommunitySection,
  join: JoinSection,
}

const DEFAULT_ORDER = ['hero', 'live', 'start', 'movement', 'grow', 'community', 'join']

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
      {/* Popup première visite (V2.7-A) — s'ouvre après 25 s. V2.10-A : chargé dynamiquement (hors bundle initial). */}
      <HomeJoinPopupLazy />

      {/* Blocs CMS existants (préservés). Injection additive : événements réels après le hero. */}
      {ordered.map((key, i) => {
        const Section = COMPONENTS[key]
        return (
          <div key={key}>
            {i > 0 && <SectionGlow />}
            <Section block={byKey[key]} />
            {key === 'hero' && (<><SectionGlow /><FeaturedEventsSection /></>)}
          </div>
        )
      })}

      {/* V2.7-A.4 : bandeau compact « Installer Citadelle » = UNIQUE CTA d'installation de
          l'accueil (le popup ne propose plus l'installation), placé AVANT la section
          internationale. Puis la présence internationale (nouveau globe image, léger et stable
          mobile) RESTAURÉE en fin d'accueil — plus d'ancien SVG, aucun blur/WebGL/canvas. */}
      <SectionGlow />
      <InstallCitadelleSection />
      <SectionGlow />
      <GlobalPresenceSection />
    </div>
  )
}

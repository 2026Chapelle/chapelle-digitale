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
 * Accueil piloté par le CMS + narration produit resserrée (2e passe).
 *
 * Ordre narratif (fallback si sort_order CMS absent) :
 *   hero → events → start (parcours) → grow → live → community
 *   → movement → globe → install (PWA unique) → join (CTA final)
 *
 * Join n'est plus une étape « comment ça marche » redondante : finale d'engagement.
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

/** Narration produit — sort_order CMS peut réordonner, join reste en fin si présent. */
const DEFAULT_ORDER = ['hero', 'start', 'grow', 'live', 'community', 'movement', 'join']

export async function HomeSections() {
  const rows = (await cmsList<Block>('cms_homepage_blocks')) ?? []
  const byKey: Record<string, Block> = {}
  for (const b of rows) byKey[b.block_key] = b

  const isVisible = (key: string) => {
    const b = byKey[key]
    if (!b) return true
    if (b.is_active === false) return false
    return b.status ? b.status === 'published' : true
  }

  const ordered = DEFAULT_ORDER
    .map((key, i) => ({ key, order: byKey[key]?.sort_order ?? i }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.key)
    .filter((key) => COMPONENTS[key] && isVisible(key))

  // Join en dernier pour conclure l'histoire (sauf s'il est désactivé).
  const mainKeys = ordered.filter((k) => k !== 'join')
  const showJoin = ordered.includes('join')

  return (
    <div className="bg-charbon relative">
      <HomeJoinPopupLazy />

      {mainKeys.map((key, i) => {
        const Section = COMPONENTS[key]
        return (
          <div key={key}>
            {i > 0 && <SectionGlow />}
            <Section block={byKey[key]} />
            {key === 'hero' && (
              <>
                <SectionGlow />
                <FeaturedEventsSection />
              </>
            )}
          </div>
        )
      })}

      {/* Moment « wow » mondial puis campagne PWA unique, avant le CTA final */}
      <SectionGlow />
      <GlobalPresenceSection />
      <SectionGlow />
      <InstallCitadelleSection />

      {showJoin && (
        <>
          <SectionGlow />
          <JoinSection block={byKey.join} />
        </>
      )}
    </div>
  )
}

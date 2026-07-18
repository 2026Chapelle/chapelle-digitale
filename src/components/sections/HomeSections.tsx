/**
 * Homepage V3 — Citadelle Experience Operating System
 *
 * Ordre narratif fixe (9 scènes) :
 *   1 Hero → 2 Preuve → 3 Vision → 4 Parcours → 5 La vie
 *   → 6 Communauté → 7 Royaume (globe) → 8 Application (PWA) → 9 CTA final
 *
 * Aucune nouvelle route / API / backend. CMS hero optionnel (cta / subtitle).
 */
import { cmsList, type CmsHomepageBlock } from '@/lib/cms'
import { HeroSection } from '@/components/sections/HeroSection'
import { ProofStripSection } from '@/components/sections/ProofStripSection'
import { VisionSection } from '@/components/sections/VisionSection'
import { StartHereSection } from '@/components/sections/StartHereSection'
import { LifeExperiencesSection } from '@/components/sections/LifeExperiencesSection'
import { CommunitySection } from '@/components/sections/CommunitySection'
import { JoinSection } from '@/components/sections/JoinSection'
import { SectionGlow } from '@/components/ui/SectionGlow'
import { HomeJoinPopupLazy } from '@/components/home/HomeJoinPopupLazy'
import { InstallCitadelleSection } from '@/components/home/InstallCitadelleSection'
import { GlobalPresenceSection } from '@/components/home/GlobalPresenceSection'

type Block = CmsHomepageBlock & {
  body?: string
  image_url?: string
  cta_label?: string
  cta_href?: string
  status?: string
  sort_order?: number
}

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

  const showHero = isVisible('hero')
  const showJoin = isVisible('join')

  return (
    <div className="bg-charbon relative">
      <HomeJoinPopupLazy />

      {/* 1 — Hero */}
      {showHero && (
        <div className="scene-hope">
          <HeroSection block={byKey.hero} />
        </div>
      )}

      {/* 2 — Preuve */}
      <div className="scene-hope">
        <ProofStripSection />
      </div>

      {/* 3 — Vision */}
      <div className="scene-transform">
        <SectionGlow />
        <VisionSection />
      </div>

      {/* 4 — Parcours */}
      <div className="scene-transform">
        <SectionGlow />
        <StartHereSection />
      </div>

      {/* 5 — La vie */}
      <div className="scene-joy">
        <SectionGlow />
        <LifeExperiencesSection />
      </div>

      {/* 6 — Communauté */}
      <div className="scene-belong">
        <SectionGlow />
        <CommunitySection />
      </div>

      {/* 7 — Le Royaume (globe) */}
      <div className="scene-mission">
        <SectionGlow />
        <GlobalPresenceSection />
      </div>

      {/* 8 — Application (PWA réelle) */}
      <div className="scene-continuity">
        <SectionGlow />
        <InstallCitadelleSection />
      </div>

      {/* 9 — CTA final */}
      {showJoin && (
        <div className="scene-decision">
          <SectionGlow />
          <JoinSection block={byKey.join} />
        </div>
      )}
    </div>
  )
}

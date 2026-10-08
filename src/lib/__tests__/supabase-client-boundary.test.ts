import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(__dirname, '../../..')
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')
function sourceFiles(dir: string): string[] {
  return readdirSync(resolve(root, dir)).flatMap((name) => {
    const relative = `${dir}/${name}`
    const absolute = resolve(root, relative)
    if (statSync(absolute).isDirectory()) return sourceFiles(relative)
    if (!/\.tsx?$/.test(name) || /\.(test|spec)\.tsx?$/.test(name)) return []
    return [relative]
  })
}

describe('Supabase browser boundary', () => {
  it('owns one cookie singleton shared by browser and member helpers', () => {
    const browser = source('src/lib/supabase-browser.ts')

    expect(browser).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]\s*;?/)
    expect(browser.match(/createClientComponentClient\(/g) ?? []).toHaveLength(1)
    expect(browser).toMatch(/export function getMemberClient\(\)[\s\S]*?return\s+getBrowserClient\(\)/)
    expect(browser).not.toMatch(/\?\?\s*supabase\b/)
  })

  it('has exactly one browser client factory and no legacy auth fallback', () => {
    const browser = source('src/lib/supabase-browser.ts')
    const shared = source('src/lib/supabase.ts')
    const admin = source('src/lib/supabase-admin.ts')
    const login = source('src/app/(auth)/login/page.tsx')
    const register = source('src/app/(auth)/register/page.tsx')

    expect(browser).toMatch(/createClientComponentClient\(/)
    expect(shared).not.toMatch(/createClient\(/)
    expect(shared).not.toMatch(/\b(?:supabaseAdmin|supabaseCmsRead)\b/)
    expect(admin).toMatch(/^import ['"]server-only['"];?/)
    expect(browser).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]\s*;?/)
    expect(browser).not.toMatch(/\?\?\s*supabase\b/)
    expect(login).not.toContain('getBrowserClient() ?? supabase')
    expect(register).not.toContain('getBrowserClient() ?? supabase')
  })

  it('keeps critical member paths on the cookie client', () => {
    for (const path of [
      'src/app/(auth)/login/page.tsx',
      'src/app/(auth)/register/page.tsx',
      'src/hooks/useAuth.ts',
      'src/app/(member)/member/dashboard/evenements/page.tsx',
      'src/app/(member)/member/dashboard/prieres/page.tsx',
    ]) {
      expect(source(path)).not.toContain('getBrowserClient() ?? supabase')
    }
  })

  it('keeps server routes off the browser client and selects anon or cookie clients by identity need', () => {
    const prayers = source('src/app/api/prieres/route.ts')
    const live = source('src/app/api/live/route.ts')
    const homeInstant = source('src/app/api/podcast/home-instant/play/route.ts')

    for (const route of [prayers, live, homeInstant]) {
      expect(route).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]\s*;?/)
      expect(route).not.toMatch(/from\s*['"]@\/lib\/supabase-browser['"]\s*;?/)
    }

    expect(prayers).toMatch(/getPublicServerClient\(\)/)
    expect(live).toMatch(/getPublicServerClient\(\)/)
    expect(live.match(/createRouteClient\(/g) ?? []).toHaveLength(2)
    expect(homeInstant).toMatch(/getPublicServerClient\(\)/)
  })

  it('routes the first browser-consumer batch through the cookie singleton', () => {
    for (const path of [
      'src/components/features/notifications/NotificationBell.tsx',
      'src/components/sections/ContextualHome.tsx',
      'src/components/sections/GrowSection.tsx',
      'src/components/sections/CommunitySection.tsx',
      'src/components/sections/LiveSection.tsx',
      'src/components/providers/AnalyticsTracker.tsx',
      'src/components/layout/Footer.tsx',
      'src/components/home/PodcastHomeSection.tsx',
    ]) {
      const component = source(path)
      expect(component, path).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]\s*;?/)
      expect(component, path).toMatch(/import\s*\{\s*getBrowserClient\s*\}\s*from\s*['"]@\/lib\/supabase-browser['"]\s*;?/)
    }
  })

  it('routes the second browser-consumer batch through the cookie singleton', () => {
    for (const path of [
      'src/components/podcast/PodcastEventsSection.tsx',
      'src/components/podcast/PodcastDiscoverSections.tsx',
      'src/app/(public)/temoignages/page.tsx',
      'src/app/(public)/priere/page.tsx',
      'src/app/(public)/evenements/page.tsx',
      'src/app/(public)/marketplace/page.tsx',
      'src/app/(public)/contact/page.tsx',
      'src/app/(public)/plateformes/[id]/PlateformePage.tsx',
    ]) {
      const component = source(path)
      expect(component, path).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]\s*;?/)
      expect(component, path).toMatch(/import\s*\{\s*getBrowserClient\s*\}\s*from\s*['"]@\/lib\/supabase-browser['"]\s*;?/)
    }
  })

  it('routes the third browser-consumer batch through the cookie singleton', () => {
    for (const path of [
      'src/lib/live/live-cult-notes-client.ts',
      'src/components/home/FeaturedEventsSection.tsx',
      'src/app/(auth)/forgot-password/page.tsx',
      'src/app/(member)/member/dashboard/lives/page.tsx',
      'src/app/(member)/member/dashboard/formations/[slug]/page.tsx',
      'src/app/(member)/member/dashboard/formations/page.tsx',
      'src/app/(public)/formations/[slug]/page.tsx',
      'src/app/(public)/formations/page.tsx',
    ]) {
      const component = source(path)
      expect(component, path).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"](?:@\/lib\/supabase|\.\.?\/supabase)['"]\s*;?/)
      expect(component, path).toMatch(/getBrowserClient/)
    }
  })

  it('routes the final browser consumers through the cookie singleton', () => {
    for (const path of [
      'src/app/(admin)/admin/podcast-premium/page.tsx',
      'src/app/(admin)/admin/playlists/page.tsx',
      'src/app/(admin)/admin/parametres/page.tsx',
      'src/app/(public)/podcast/page.tsx',
      'src/app/(public)/live/page.tsx',
    ]) {
      const component = source(path)
      expect(component, path).not.toMatch(/import\s*\{[^}]*\bsupabase\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]\s*;?/)
      expect(component, path).toMatch(/getBrowserClient/)
    }
  })

  it('keeps Giving shared code browser-safe and confines privileged readers server-side', () => {
    const giving = source('src/lib/giving.ts')
    const clientModules = [
      'src/components/features/giving/GivingProductsGrid.tsx',
      'src/components/features/giving/GivingWidget.tsx',
      'src/components/features/giving/LiveOffering.tsx',
      'src/app/(public)/dons/page.tsx',
    ]

    expect(giving).not.toMatch(/from\s*['"]@\/lib\/supabase-admin['"]|\bsupabaseAdmin\b/)
    for (const path of clientModules) {
      const client = source(path)
      expect(client, path).not.toMatch(/from\s*['"]@\/lib\/giving-server['"]|from\s*['"]@\/lib\/supabase-admin['"]|\bsupabaseAdmin\b/)
    }

    expect(source('src/app/api/dons/route.ts')).toMatch(/getGivingProducts[^\n]*from\s*['"]@\/lib\/giving-server['"]|from\s*['"]@\/lib\/giving-server['"][^\n]*getGivingProducts/)
    expect(source('src/app/api/giving/products/route.ts')).toMatch(/from\s*['"]@\/lib\/giving-server['"]\s*;?/)

    const serverPath = resolve(root, 'src/lib/giving-server.ts')
    if (existsSync(serverPath)) {
      const server = source('src/lib/giving-server.ts')
      expect(server).toMatch(/^import ['"]server-only['"];?/)
      expect(server).toMatch(/\bsupabaseAdmin\b/)
      expect(server).toMatch(/export async function getGivingProducts\(/)
      expect(server).toMatch(/export async function getAllGivingProducts\(/)
      expect(server).toMatch(/export async function getGivingWidgetSettings\(/)
    }
  })

  it('keeps Goals shared exports browser-safe and confines privileged storage server-side', () => {
    const goalsIndex = source('src/lib/intelligence/goals/index.ts')
    const goalsStore = source('src/lib/intelligence/goals/store.ts')
    const clientPage = source('src/app/(admin)/admin/intelligence/goals/page.tsx')

    expect(goalsIndex).not.toMatch(/export\s*\*\s*from\s*['"]\.\/store-server['"]|supabase-admin/)
    expect(goalsStore).not.toMatch(/supabaseAdmin|supabase-admin|countRange\(/)
    expect(clientPage).not.toMatch(/from\s*['"]@\/lib\/intelligence\/goals\/store-server['"]|supabase-admin/)

    const server = source('src/lib/intelligence/goals/store-server.ts')
    expect(server).toMatch(/^import ['"]server-only['"];?/)
    expect(server).toMatch(/supabaseAdmin/)
    expect(source('src/app/api/admin/intelligence/goals/route.ts')).toMatch(/from\s*['"]@\/lib\/intelligence\/goals\/store-server['"]\s*;?/)
    expect(source('src/app/api/intelligence/performance/route.ts')).toMatch(/from\s*['"]@\/lib\/intelligence\/goals\/store-server['"]\s*;?/)
  })

  it('keeps privileged server helpers on the server-only admin module', () => {
    for (const path of [
      'src/lib/activity.ts',
      'src/lib/giving.ts',
      'src/lib/prayers/server.ts',
      'src/lib/documents/document-delivery-server.ts',
      'src/lib/notify.ts',
      'src/lib/notifications/events.ts',
      'src/lib/notifications/channels.ts',
      'src/lib/nation-stats.ts',
      'src/lib/formations/parcours-gate-server.ts',
      'src/lib/formations/integration-progress-server.ts',
      'src/lib/canonical/canonical-server.ts',
      'src/lib/erp/unit-governance-rpc.ts',
      'src/lib/erp/unit-governance-repository.ts',
      'src/lib/erp/unit-access.ts',
      'src/lib/erp/resolve-canonical-organization.ts',
      'src/lib/erp/admin-profiles-scope.ts',
      'src/lib/passkeys/audit.ts',
      'src/lib/passkeys/identity.ts',
      'src/lib/passkeys/store.ts',
      'src/app/api/admin/passkeys/authenticate/verify/route.ts',
      'src/app/api/member/announcements/route.ts',
      'src/app/api/member/achats/route.ts',
      'src/app/api/member/ressources/route.ts',
      'src/app/api/member/prieres/route.ts',
      'src/app/api/member/evenements/route.ts',
      'src/app/api/member/dons/route.ts',
      'src/app/api/member/groupes/route.ts',
      'src/app/api/member/delivrance/route.ts',
      'src/app/api/member/notifications/route.ts',
      'src/app/api/member/nation/route.ts',
      'src/app/api/admin/command-center/route.ts',
      'src/app/api/admin/communication/announcements/route.ts',
      'src/app/api/admin/communication/campaigns/route.ts',
      'src/app/api/admin/communication/templates/route.ts',
      'src/app/api/admin/contact/route.ts',
      'src/app/api/admin/featured/route.ts',
      'src/app/api/admin/international/route.ts',
      'src/app/api/admin/marketplace/route.ts',
      'src/lib/teachings/teaching-access-server.ts',
      'src/lib/teachings/teaching-library-server.ts',
      'src/lib/pdf/documents-server.ts',
      'src/lib/podcast/spine-public.ts',
      'src/lib/communication/audience.ts',
      'src/lib/intelligence/goals/store-server.ts',
      'src/lib/intelligence/editorial/store.ts',
      'src/lib/intelligence/performance/count-sources.ts',
      'src/lib/live/live-admin-supervision-server.ts',
      'src/lib/live/live-cult-notes-server.ts',
      'src/lib/live/live-participation-server.ts',
      'src/lib/live/live-share-server.ts',
      'src/lib/live/live-reactions-server.ts',
      'src/lib/live/live-replay-progress-server.ts',
      'src/lib/chapelle/admin-live.ts',
      'src/lib/pastoral/engagement-server.ts',
      'src/lib/community/groups-server.ts',
      'src/lib/community/presences-server.ts',
      'src/lib/pastoral/member-360-server.ts',
      'src/lib/pastoral/newcomer-admin-client.ts',
      'src/lib/pastoral/platform-server.ts',
      'src/lib/pastoral/statut-history-server.ts',
      'src/app/api/admin/groupes/route.ts',
      'src/app/api/admin/pastoral/overview/route.ts',
      'src/app/api/admin/academy/[resource]/route.ts',
      'src/app/api/admin/activites/route.ts',
      'src/app/api/admin/analytics/route.ts',
      'src/app/api/admin/cartographie/route.ts',
      'src/app/api/admin/cms/[resource]/route.ts',
      'src/app/api/admin/delivrance/route.ts',
      'src/app/api/admin/giving/[resource]/route.ts',
      'src/app/api/admin/global-command/route.ts',
      'src/app/(public)/enseignements/[slug]/page.tsx',
      'src/app/api/acces/[token]/route.ts',
      'src/app/api/activity/route.ts',
      'src/app/api/admin/gouvernance/route.ts',
      'src/app/api/admin/gouvernement/route.ts',
      'src/app/api/admin/intercesseurs/route.ts',
      'src/app/api/admin/lms/[resource]/route.ts',
      'src/app/api/admin/membres/route.ts',
      'src/app/api/admin/membres/[id]/action/route.ts',
      'src/app/api/admin/messages/route.ts',
      'src/app/api/admin/nation/route.ts',
      'src/app/api/admin/newcomer-intakes/route.ts',
      'src/app/api/admin/newcomer-journey/route.ts',
      'src/app/api/admin/newsletter/campaigns/route.ts',
      'src/app/api/admin/newsletter/route.ts',
      'src/app/api/admin/notifications/route.ts',
      'src/app/api/admin/notifications/stats/route.ts',
      'src/app/api/admin/organization/route.ts',
      'src/app/api/admin/organization-hierarchy/route.ts',
      'src/app/api/admin/organization-settings/route.ts',
      'src/app/api/admin/organization-unit-invitations/[id]/revoke/route.ts',
      'src/app/api/admin/organization-unit-settings/route.ts',
      'src/app/api/admin/organization-units/route.ts',
      'src/app/api/admin/organization-units/[id]/route.ts',
      'src/app/api/admin/pastoral-alerts/route.ts',
      'src/app/api/admin/pastoral-settings/route.ts',
      'src/app/api/admin/playlists/items/route.ts',
      'src/app/api/admin/playlists/route.ts',
      'src/app/api/admin/podcast-analytics/route.ts',
      'src/app/api/admin/podcast-premium/route.ts',
      'src/app/api/admin/questions/route.ts',
      'src/app/api/admin/roles/summary/route.ts',
      'src/app/api/admin/sante/route.ts',
      'src/app/api/admin/stats/route.ts',
      'src/app/api/admin/submissions/[resource]/route.ts',
      'src/app/api/admin/transactions/route.ts',
      'src/app/api/admin/tunnel/route.ts',
      'src/app/api/admin/upload/route.ts',
      'src/app/api/analytics/route.ts',
      'src/app/api/analytics/track/route.ts',
      'src/app/api/certificat/[reference]/route.ts',
      'src/app/api/cron/notifications/route.ts',
      'src/app/api/cron/podcast-analytics-maintenance/route.ts',
      'src/app/api/cron/scorecard/route.ts',
      'src/app/api/documents/[id]/access/route.ts',
      'src/app/api/dons/route.ts',
      'src/app/api/enseignements/[id]/access/route.ts',
      'src/app/api/enseignements/[id]/comments/route.ts',
      'src/app/api/evenements/counts/route.ts',
      'src/app/api/evenements/inscription/route.ts',
      'src/app/api/giving/log/route.ts',
      'src/app/api/intelligence/acquisition/route.ts',
      'src/app/api/intelligence/campaigns/route.ts',
      'src/app/api/intelligence/conversions/route.ts',
      'src/app/api/intelligence/decision/route.ts',
      'src/app/api/intelligence/meta/route.ts',
      'src/app/api/intelligence/overview/route.ts',
      'src/app/api/intelligence/performance/route.ts',
      'src/app/api/intelligence/whatsapp/route.ts',
      'src/app/api/member/certificats/route.ts',
      'src/app/api/member/certificats/viewed/route.ts',
      'src/app/api/member/formateur/route.ts',
      'src/app/api/member/formations/enroll/route.ts',
      'src/app/api/member/formations/route.ts',
      'src/app/api/member/formations/video-progress/route.ts',
      'src/app/api/member/formations/[id]/modules/route.ts',
      'src/app/api/member/formations/[id]/questions/route.ts',
      'src/app/api/member/integration/route.ts',
      'src/app/api/member/messages/route.ts',
      'src/app/api/membres/route.ts',
      'src/app/api/podcast/analytics/route.ts',
      'src/app/api/podcast/home-instant/play/route.ts',
      'src/app/api/podcast/popularity/route.ts',
      'src/app/api/podcast/[id]/play/route.ts',
      'src/app/api/priere/pray/route.ts',
      'src/app/api/recu/[reference]/route.ts',
      'src/app/api/track/open/route.ts',
      'src/app/api/tunnel/lead/route.ts',
      'src/app/api/webhook/chariow/route.ts',
      'src/app/lecture/pdf/[id]/page.tsx',
      'src/app/livret-accueil/route.ts',
      'src/app/preview/[type]/[id]/page.tsx',
      'src/app/sitemap.ts',
      'src/lib/cms.ts',
      'src/lib/mahanaim/member-retreats-server.ts',
    ]) {
      expect(source(path), path).not.toMatch(/\bsupabaseAdmin\s*[,}]?[^\n]*from ['"]@\/lib\/supabase['"]|import\s*\{[^}]*\bsupabaseAdmin\b[^}]*\}\s*from ['"]@\/lib\/supabase['"]/)
    }
  })

  it('does not import privileged clients from the legacy shared module anywhere in runtime source', () => {
    const violations = sourceFiles('src')
      .filter((path) => /from\s*['"]@\/lib\/supabase['"]/.test(source(path)))
      .filter((path) => /import\s*\{[^}]*\b(?:supabaseAdmin|supabaseCmsRead)\b[^}]*\}\s*from\s*['"]@\/lib\/supabase['"]/.test(source(path)))
    expect(violations).toEqual([])
  })
})

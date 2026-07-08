import { describe, it, expect } from 'vitest'
import { NAV_SECTIONS, PINNED_DASHBOARD, allNavHrefs } from '@/lib/navigation/admin-nav'
import { getVisibleSections, isItemVisible } from '@/lib/navigation/nav-visibility'
import type { AdminNavItem } from '@/lib/navigation/admin-nav'

// Liste EXACTE des 48 liens de l'ancienne sidebar plate (référence anti-régression).
const LEGACY_HREFS = [
  '/admin/command-center', '/admin/global-command', '/admin/dashboard', '/admin/pastoral',
  '/admin/nouveaux-venus', '/admin/intelligence-pastorale', '/admin/gouvernement', '/admin/gouvernance',
  '/admin/international', '/admin/nation-dashboard', '/admin/sante-spirituelle', '/admin/activites',
  '/admin/cartographie', '/admin/membres', '/admin/roles', '/admin/communication', '/admin/tunnel-integration',
  '/admin/homepage-blocks', '/admin/pages', '/admin/articles', '/admin/medias', '/admin/lives', '/admin/podcasts',
  '/admin/enseignements', '/admin/formations', '/admin/modules', '/admin/parcours', '/admin/questions-formations',
  '/admin/evenements', '/admin/inscriptions', '/admin/temoignages', '/admin/dons', '/admin/transactions',
  '/admin/marketplace', '/admin/notifications', '/admin/prieres', '/admin/prieres-guides', '/admin/temoignages-prieres',
  '/admin/delivrance', '/admin/groupes', '/admin/reunions', '/admin/messages', '/admin/newsletter', '/admin/formulaires',
  '/admin/statistiques', '/admin/analytics', '/admin/parametres', '/admin/aide',
]

describe('admin-nav — préservation des liens (anti-régression)', () => {
  it('conserve EXACTEMENT les 48 liens historiques, sans perte', () => {
    const hrefs = allNavHrefs()
    expect(new Set(hrefs)).toEqual(new Set(LEGACY_HREFS))
    expect(hrefs.length).toBe(LEGACY_HREFS.length)
  })
  it('aucun lien en double', () => {
    const hrefs = allNavHrefs()
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
  it('Dashboard est épinglé (hors sections)', () => {
    expect(PINNED_DASHBOARD.href).toBe('/admin/dashboard')
    const inSections = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href))
    expect(inSections).not.toContain('/admin/dashboard')
  })
  it('les liens de repli (Aide, Déconnexion via layout) restent accessibles', () => {
    expect(allNavHrefs()).toContain('/admin/aide')
    // Dashboard épinglé + Aide présents → jamais de menu vide
    expect(allNavHrefs()).toContain('/admin/dashboard')
  })
})

describe('admin-nav — structure des sections', () => {
  it('a des ids uniques et aucune section vide', () => {
    const ids = NAV_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of NAV_SECTIONS) expect(s.items.length).toBeGreaterThan(0)
  })
  it('propose ~10 sections lisibles', () => {
    expect(NAV_SECTIONS.length).toBeGreaterThanOrEqual(8)
    expect(NAV_SECTIONS.length).toBeLessThanOrEqual(12)
  })
})

describe('nav-visibility — non destructif par défaut', () => {
  it('sans contexte → renvoie TOUTES les sections (identique à l’existant)', () => {
    expect(getVisibleSections(NAV_SECTIONS)).toBe(NAV_SECTIONS)
  })
  it('avec un rôle mais items sans métadonnées roles → tout reste visible', () => {
    const visible = getVisibleSections(NAV_SECTIONS, { role: 'responsable_national' })
    const count = visible.flatMap((s) => s.items).length
    expect(count).toBe(NAV_SECTIONS.flatMap((s) => s.items).length)
  })
  it('isItemVisible respecte roles/permission quand fournis (futur socle)', () => {
    const superOnly: AdminNavItem = { label: 'X', href: '/admin/x', icon: PINNED_DASHBOARD.icon, color: '#000', roles: ['super_admin'] }
    expect(isItemVisible(superOnly)).toBe(true) // pas de contexte → visible
    expect(isItemVisible(superOnly, { role: 'super_admin' })).toBe(true)
    expect(isItemVisible(superOnly, { role: 'formateur' })).toBe(false)
    const permItem: AdminNavItem = { label: 'Y', href: '/admin/y', icon: PINNED_DASHBOARD.icon, color: '#000', permission: 'can_manage_roles' }
    expect(isItemVisible(permItem, { role: 'admin', can: () => false })).toBe(false)
    expect(isItemVisible(permItem, { role: 'admin', can: () => true })).toBe(true)
  })
})

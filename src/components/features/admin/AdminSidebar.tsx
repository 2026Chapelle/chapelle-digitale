'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'
import { NAV_SECTIONS, PINNED_DASHBOARD, type AdminNavItem, type AdminNavSection } from '@/lib/navigation/admin-nav'
import { getVisibleSections } from '@/lib/navigation/nav-visibility'

/**
 * Menu latéral du back-office (V2.5-C-①) — sections rétractables.
 * Réduit la surcharge (48 liens plats → 10 sections + Dashboard épinglé) SANS filtrage de
 * sécurité par rôle : sans contexte, `getVisibleSections` renvoie TOUT (non régressif).
 * État ouvert/fermé persistant via localStorage (fallback : valeurs par défaut de la config).
 * La sidebar est desktop-only (le mobile utilise MobileAdminBar, inchangé).
 */
const STORAGE_KEY = 'admin_nav_sections_open'

const isItemActive = (pathname: string, href: string) =>
  pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href))

/** État d'ouverture par défaut (déterministe pour le SSR). */
function defaultOpenState(sections: AdminNavSection[]): Record<string, boolean> {
  const s: Record<string, boolean> = {}
  for (const sec of sections) s[sec.id] = !!sec.defaultOpen
  return s
}

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  // Sans contexte de rôle → toutes les sections (comportement non régressif).
  const sections = getVisibleSections(NAV_SECTIONS)
  const activeSectionId = sections.find((s) => s.items.some((i) => isItemActive(pathname, i.href)))?.id ?? null

  const [open, setOpen] = useState<Record<string, boolean>>(() => defaultOpenState(sections))

  // Hydratation depuis localStorage après montage (évite tout mismatch SSR ; fallback = défauts).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setOpen((cur) => ({ ...cur, ...JSON.parse(raw) }))
    } catch { /* localStorage indisponible : on garde les défauts */ }
  }, [])

  function toggle(id: string) {
    setOpen((cur) => {
      const next = { ...cur, [id]: !cur[id] }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      router.replace('/admin/login')
      router.refresh()
    }
  }

  function renderItem(item: AdminNavItem) {
    const active = isItemActive(pathname, item.href)
    return (
      <Link key={item.href} href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl font-inter text-sm font-medium transition-all duration-200 relative',
          active ? 'bg-white/[0.06] text-pearl' : 'text-pearl/40 hover:text-pearl/80 hover:bg-white/[0.03]',
        )}
      >
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: item.color }} />
        )}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: active ? `${item.color}20` : 'transparent' }}>
          <item.icon className="w-3.5 h-3.5" style={{ color: active ? item.color : 'currentColor' }} />
        </div>
        <span className="flex-1">{item.label}</span>
      </Link>
    )
  }

  return (
    <aside className="flex flex-col h-full py-6 px-3">
      <div className="px-3 mb-5">
        <Link href="/" className="flex items-center gap-2.5 mb-3 group">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-70 blur-lg transition-opacity duration-500"
              style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
            <Image src="/images/logo-mark.png" alt="CIER" width={36} height={36}
              className="relative w-9 h-9 object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]" />
          </div>
          <span className="font-cinzel font-bold text-sm tracking-[0.15em] text-gold">CIER</span>
        </Link>
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold/60 font-inter">Administration</div>
          <NotificationBell endpoint="/api/admin/notifications" storageKey="notif_read_admin" />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto pr-0.5">
        {/* Dashboard épinglé — toujours visible */}
        {renderItem(PINNED_DASHBOARD)}

        {sections.map((section) => {
          const isOpen = (open[section.id] ?? !!section.defaultOpen) || section.id === activeSectionId
          return (
            <div key={section.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggle(section.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.14em] text-pearl/35 hover:text-pearl/60 transition-colors"
              >
                <section.icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 text-left">{section.label}</span>
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', !isOpen && '-rotate-90')} />
              </button>
              {isOpen && <div className="mt-0.5 space-y-0.5">{section.items.map(renderItem)}</div>}
            </div>
          )
        })}
      </nav>

      {/* Déconnexion — toujours visible */}
      <button
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm font-medium text-pearl/40 hover:text-danger hover:bg-danger/5 transition-all w-full"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"><LogOut className="w-3.5 h-3.5" /></div>
        Déconnexion
      </button>
    </aside>
  )
}

'use client'
import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, ChevronDown, Bell, Search, Tv, BookOpen, Users, Heart, Calendar, Home, UserCircle, LogIn, Play, Headphones, Church, Flame, Crown, Shield, GraduationCap, Sparkles, HeartHandshake, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'
import { GlobalSearchModal } from '@/components/ui/GlobalSearchModal'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'

const NAV_ITEMS = [
  { label: 'Accueil', href: '/', icon: Home },
  {
    label: 'Cultes',
    href: '/live',
    icon: Tv,
    badge: 'DIRECT',
  },
  {
    label: 'Plateformes',
    href: '/plateformes',
    icon: Users,
    children: [
      { label: 'CIER — Corps Principal', href: '/plateformes/cier', Icon: Church, color: '#D4AF37' },
      { label: 'Chapelle Familiale', href: '/plateformes/chapelle-familiale', Icon: Home, color: '#22C55E' },
      { label: 'Jeunesse', href: '/plateformes/jeunesse', Icon: Flame, color: '#9333EA' },
      { label: "Femmes d'Exceptions", href: '/plateformes/femmes-exceptions', Icon: Crown, color: '#EC4899' },
      { label: 'Cité du Refuge', href: '/plateformes/cite-refuge', Icon: Shield, color: '#14B8A6' },
      { label: 'CFIC — Formation', href: '/plateformes/cfic', Icon: GraduationCap, color: '#8B5CF6' },
      { label: 'Mahanaïm — Prière', href: '/plateformes/mahanaim', Icon: Sparkles, color: '#A855F7' },
      { label: 'Familles de la Chapelle', href: '/plateformes/familles-chapelle', Icon: HeartHandshake, color: '#F5E6A7' },
    ] as { label: string; href: string; Icon: LucideIcon; color: string }[],
  },
  {
    label: 'Formations',
    href: '/formations',
    icon: BookOpen,
    children: [
      { label: 'Formations', href: '/formations', Icon: BookOpen, color: '#D4AF37' },
      { label: 'Podcast', href: '/podcast', Icon: Headphones, color: '#14B8A6' },
    ] as { label: string; href: string; Icon: LucideIcon; color: string }[],
  },
  { label: 'Prière', href: '/priere', icon: Heart },
  { label: 'Dons', href: '/dons', icon: Heart },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  // En contexte back-office (/admin/*), le bouton d'espace doit rester dans l'univers
  // administration (et non renvoyer vers l'espace membre). Purement UX — aucun RBAC ici.
  const isAdminArea = pathname?.startsWith('/admin') ?? false

  // Page d'accueil → matériau « Liquid Glass » (verre translucide + réfraction SVG).
  // Ailleurs, on conserve strictement l'entête existant (règle des acquis : on étend,
  // on ne remplace pas). Le verre ne « prend » que sur un fond riche : le hero animé.
  const isHome = pathname === '/'

  // The entire platform is now cinematic dark — keep boolean for legacy checks
  const isDarkPage = true

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setMobileOpen(false)
        setActiveDropdown(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const closeAll = useCallback(() => {
    setMobileOpen(false)
    setActiveDropdown(null)
  }, [])

  useEffect(() => { closeAll() }, [pathname, closeAll])

  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])

  return (
    <>
      <motion.header
        initial={{ y: -28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className={cn(
          'z-50',
          isHome
            ? 'lg lg--refract !fixed top-0 left-0 right-0 border-b transition-[border-color,box-shadow] duration-500 ease-out'
            : cn(
                'fixed top-0 left-0 right-0 transition-all duration-500 ease-out',
                scrolled
                  ? 'bg-[#050308]/85 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                  : 'bg-gradient-to-b from-black/40 via-black/10 to-transparent backdrop-blur-md'
              )
        )}
        style={
          isHome
            ? ({
                // Liquid glass renforcé · densifie au scroll
                '--lg-radius': '0px',
                '--lg-tint': scrolled ? '0.14' : '0.06',
                '--lg-blur': scrolled ? '24px' : '14px',
                '--lg-stroke': scrolled ? '0.22' : '0.14',
                borderColor: scrolled ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
                boxShadow: scrolled
                  ? '0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.05)',
              } as CSSProperties)
            : undefined
        }
      >
        <div className="container-royal relative z-10">
          {/* Encore plus compact ; réduit au scroll */}
          <div
            className={cn(
              'flex items-center justify-between transition-[height] duration-500 ease-out',
              scrolled ? 'h-11 md:h-12' : 'h-12 md:h-14'
            )}
          >
            {/* LOGO seul — signature marque */}
            <Link
              href="/"
              className="flex items-center group flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37] rounded-full"
              aria-label="Citadelle — Accueil"
            >
              <div className={cn('relative transition-all duration-500', scrolled ? 'w-7 h-7' : 'w-8 h-8')}>
                <div
                  className="absolute inset-0 rounded-full opacity-35 group-hover:opacity-70 blur-xl transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
                />
                <Image
                  src="/images/logo-mark.png"
                  alt="Citadelle"
                  width={36}
                  height={36}
                  priority
                  className="relative w-full h-full object-contain drop-shadow-[0_2px_10px_rgba(212,175,55,0.4)] transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </Link>

            {/* DESKTOP NAV */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                const linkColor = isActive ? '#F5E6A7' : 'rgba(245,230,216,0.65)'

                return (
                  <div key={item.href} className="relative">
                    {item.children ? (
                      <button
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium font-inter transition-all duration-200"
                        style={{ color: linkColor }}
                        onMouseEnter={() => setActiveDropdown(item.label)}
                        onMouseLeave={() => setActiveDropdown(null)}
                        onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                      >
                        {item.label}
                        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', activeDropdown === item.label && 'rotate-180')} />
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium font-inter transition-all duration-200"
                        style={{ color: linkColor }}
                      >
                        {item.label}
                        {item.badge && (
                          <span className="badge-live text-[9px] px-1.5 py-0.5">{item.badge}</span>
                        )}
                      </Link>
                    )}

                    {/* Dropdown */}
                    {item.children && (
                      <AnimatePresence>
                        {activeDropdown === item.label && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.97 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 rounded-2xl p-1.5 overflow-hidden"
                            style={{
                              background: isDarkPage ? 'rgba(10,0,20,0.95)' : 'rgba(255,255,255,0.98)',
                              backdropFilter: 'blur(20px)',
                              border: isDarkPage ? '1px solid rgba(212,175,55,0.12)' : '1px solid rgba(0,0,0,0.08)',
                              boxShadow: isDarkPage ? '0 20px 60px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.1)',
                            }}
                            onMouseEnter={() => setActiveDropdown(item.label)}
                            onMouseLeave={() => setActiveDropdown(null)}
                          >
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group"
                                style={{ color: isDarkPage ? 'rgba(255,255,255,0.65)' : '#6B7280' }}
                                onMouseEnter={e => {
                                  const el = e.currentTarget
                                  el.style.background = isDarkPage ? 'rgba(212,175,55,0.06)' : 'rgba(0,0,0,0.04)'
                                  el.style.color = isDarkPage ? '#D4AF37' : '#111827'
                                }}
                                onMouseLeave={e => {
                                  const el = e.currentTarget
                                  el.style.background = 'transparent'
                                  el.style.color = isDarkPage ? 'rgba(255,255,255,0.65)' : '#6B7280'
                                }}
                              >
                                <span
                                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: `${child.color}18`, border: `1px solid ${child.color}30` }}
                                >
                                  <child.Icon className="w-3.5 h-3.5" style={{ color: child.color }} />
                                </span>
                                <span className="font-inter font-medium">{child.label}</span>
                              </Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}
                  </div>
                )
              })}
            </nav>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 border"
                style={{
                  color: isDarkPage ? 'rgba(255,255,255,0.35)' : '#9CA3AF',
                  background: isDarkPage ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  borderColor: isDarkPage ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <Search className="w-3.5 h-3.5" />
                <span className="text-xs font-inter hidden lg:block">Rechercher…</span>
                <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] font-mono bg-black/10 px-1.5 py-0.5 rounded-md" style={{ color: 'inherit', opacity: 0.6 }}>
                  ⌘K
                </kbd>
              </button>

              {user ? (
                <>
                  <NotificationBell endpoint="/api/member/notifications" storageKey="notif_read_member" realtimeTable="app_notifications" markEndpoint="/api/member/notifications" />
                  <Link
                    href={isAdminArea ? '/admin/dashboard' : '/member/dashboard'}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-inter text-xs font-semibold transition-all duration-200"
                    style={
                      isDarkPage
                        ? { background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }
                        : { background: '#111827', color: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                    }
                  >
                    {isAdminArea ? <Shield className="w-3.5 h-3.5" /> : <UserCircle className="w-3.5 h-3.5" />}
                    <span className="hidden sm:block">{isAdminArea ? 'Back-office' : 'Mon Espace'}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:flex items-center px-4 py-2 rounded-lg font-inter text-sm font-medium transition-all duration-200"
                    style={{ color: isDarkPage ? 'rgba(255,255,255,0.55)' : '#6B7280' }}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/rejoindre"
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-inter text-sm font-semibold transition-all duration-300 hover:-translate-y-px"
                    style={
                      isDarkPage
                        ? {
                            background: 'linear-gradient(135deg, #D4AF37, #C49A20)',
                            color: '#1A0F00',
                            boxShadow: '0 4px 16px rgba(212,175,55,0.35)',
                          }
                        : {
                            background: '#111827',
                            color: '#FFFFFF',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                          }
                    }
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Rejoindre
                  </Link>
                </>
              )}

              <button
                type="button"
                className="lg:hidden flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl transition-colors"
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={mobileOpen}
                aria-controls="citadelle-mobile-sheet"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* MOBILE — bottom sheet liquid glass */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] lg:hidden"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px] border-0 cursor-default"
              aria-label="Fermer le menu"
              onClick={closeAll}
            />
            <motion.div
              id="citadelle-mobile-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-0 left-0 right-0 max-h-[78vh] overflow-y-auto rounded-t-[1.75rem] lg lg--refract border-t border-white/10"
              style={
                {
                  '--lg-radius': '1.75rem 1.75rem 0 0',
                  '--lg-tint': '0.12',
                  '--lg-blur': '22px',
                  '--lg-stroke': '0.16',
                  background:
                    'linear-gradient(180deg, rgba(18,16,28,0.92) 0%, rgba(8,8,14,0.96) 100%)',
                  boxShadow: '0 -20px 60px rgba(0,0,0,0.45)',
                  paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))',
                } as CSSProperties
              }
            >
              <div className="flex justify-center pt-3 pb-2" aria-hidden>
                <span className="block w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3">
                <p className="font-cinzel text-sm tracking-[0.2em] text-gold/80 uppercase">Menu</p>
                <button
                  type="button"
                  onClick={closeAll}
                  className="w-11 h-11 flex items-center justify-center rounded-full text-pearl/60 hover:text-pearl"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="px-3 pb-4 flex flex-col gap-0.5">
                {/* Liens principaux + Podcast en clair sur mobile */}
                {[
                  { label: 'Accueil', href: '/', icon: Home },
                  { label: 'Cultes', href: '/live', icon: Tv },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeAll}
                    className="flex items-center gap-3 px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium"
                    style={{ color: pathname === item.href ? '#D4AF37' : 'rgba(245,230,216,0.75)' }}
                  >
                    <item.icon className="w-4 h-4 opacity-70" aria-hidden />
                    {item.label}
                  </Link>
                ))}

                {/* Plateformes accordion */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium"
                  style={{ color: 'rgba(245,230,216,0.75)' }}
                  onClick={() => setActiveDropdown(activeDropdown === 'Plateformes' ? null : 'Plateformes')}
                  aria-expanded={activeDropdown === 'Plateformes'}
                >
                  <span className="inline-flex items-center gap-3">
                    <Users className="w-4 h-4 opacity-70" aria-hidden />
                    Plateformes
                  </span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform', activeDropdown === 'Plateformes' && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'Plateformes' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-4"
                    >
                      {NAV_ITEMS.find((n) => n.label === 'Plateformes')?.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={closeAll}
                          className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-inter"
                          style={{ color: 'rgba(245,230,216,0.5)' }}
                        >
                          <child.Icon className="w-3.5 h-3.5" style={{ color: child.color }} aria-hidden />
                          {child.label}
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Formations accordion */}
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium"
                  style={{ color: 'rgba(245,230,216,0.75)' }}
                  onClick={() => setActiveDropdown(activeDropdown === 'Formations' ? null : 'Formations')}
                  aria-expanded={activeDropdown === 'Formations'}
                >
                  <span className="inline-flex items-center gap-3">
                    <BookOpen className="w-4 h-4 opacity-70" aria-hidden />
                    Formations
                  </span>
                  <ChevronDown className={cn('w-4 h-4 transition-transform', activeDropdown === 'Formations' && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {activeDropdown === 'Formations' && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden pl-4"
                    >
                      <Link href="/formations" onClick={closeAll} className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-inter" style={{ color: 'rgba(245,230,216,0.5)' }}>
                        <BookOpen className="w-3.5 h-3.5 text-gold" aria-hidden />
                        Formations
                      </Link>
                      <Link href="/podcast" onClick={closeAll} className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl text-sm font-inter" style={{ color: 'rgba(245,230,216,0.5)' }}>
                        <Headphones className="w-3.5 h-3.5 text-teal-400" aria-hidden />
                        Podcast
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Podcast clair + reste */}
                <Link href="/podcast" onClick={closeAll} className="flex items-center gap-3 px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium" style={{ color: pathname?.startsWith('/podcast') ? '#D4AF37' : 'rgba(245,230,216,0.75)' }}>
                  <Headphones className="w-4 h-4 opacity-70" aria-hidden />
                  Podcast
                </Link>
                <Link href="/priere" onClick={closeAll} className="flex items-center gap-3 px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium" style={{ color: pathname?.startsWith('/priere') ? '#D4AF37' : 'rgba(245,230,216,0.75)' }}>
                  <Heart className="w-4 h-4 opacity-70" aria-hidden />
                  Prière
                </Link>
                <Link href="/dons" onClick={closeAll} className="flex items-center gap-3 px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium" style={{ color: pathname?.startsWith('/dons') ? '#D4AF37' : 'rgba(245,230,216,0.75)' }}>
                  <Heart className="w-4 h-4 opacity-70" aria-hidden />
                  Dons
                </Link>
                <Link href="/login" onClick={closeAll} className="flex items-center gap-3 px-4 min-h-[48px] rounded-xl font-inter text-sm font-medium" style={{ color: 'rgba(245,230,216,0.75)' }}>
                  <LogIn className="w-4 h-4 opacity-70" aria-hidden />
                  Connexion
                </Link>
              </nav>

              <div className="px-4 pt-2 pb-2">
                {user ? (
                  <Link
                    href={isAdminArea ? '/admin/dashboard' : '/member/dashboard'}
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl font-inter font-semibold text-sm bg-gold/15 text-gold border border-gold/25"
                  >
                    {isAdminArea ? 'Back-office' : 'Mon Espace'}
                  </Link>
                ) : (
                  <Link
                    href="/rejoindre"
                    onClick={closeAll}
                    className="flex items-center justify-center gap-2 min-h-[48px] rounded-xl font-inter font-semibold text-sm"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}
                  >
                    Rejoindre
                  </Link>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

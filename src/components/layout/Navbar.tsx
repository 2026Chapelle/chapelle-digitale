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
  { label: 'Formations', href: '/formations', icon: BookOpen },
  { label: 'Podcast', href: '/podcast', icon: Headphones },
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
    const handleScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
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

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          'z-50 transition-all duration-500',
          isHome
            // Verre liquide sur l'accueil. `!fixed` force la position fixe au-dessus
            // du `position: relative` porté par la classe `.lg`. `border-b` donne le
            // liseré bas discret d'une barre translucide pleine largeur.
            ? 'lg lg--refract !fixed top-0 left-0 right-0 border-b border-white/[0.08]'
            : cn(
                'fixed top-0 left-0 right-0',
                scrolled
                  ? 'bg-[#050308]/85 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.5)]'
                  : 'bg-gradient-to-b from-black/40 via-black/10 to-transparent backdrop-blur-md'
              )
        )}
        style={
          isHome
            ? ({
                // Barre pleine largeur → pas d'arrondi ; frost/tint discrets pour
                // laisser le hero doré transparaître et garder le texte lisible.
                '--lg-radius': '0px',
                '--lg-tint': scrolled ? '0.10' : '0.06',
                '--lg-blur': scrolled ? '16px' : '10px',
                '--lg-stroke': '0.16',
              } as CSSProperties)
            : undefined
        }
      >
        <div className="container-royal relative z-10">
          <div className="flex items-center justify-between h-20">

            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
              <div className="relative w-10 h-10">
                <div
                  className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-75 blur-xl transition-opacity duration-500"
                  style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }}
                />
                <Image
                  src="/images/logo-mark.png"
                  alt="CIER — La Chapelle Internationale des Élus du Royaume"
                  width={40}
                  height={40}
                  priority
                  className="relative w-10 h-10 object-contain drop-shadow-[0_2px_10px_rgba(212,175,55,0.45)] transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="hidden sm:block">
                <div
                  className="font-cinzel font-bold text-sm leading-tight tracking-[0.15em]"
                  style={{ color: '#F5E6A7' }}
                >
                  CIER
                </div>
                <div
                  className="font-inter text-[9px] tracking-[0.25em] uppercase"
                  style={{ color: 'rgba(245,230,216,0.4)' }}
                >
                  Une Église Ouverte au Monde
                </div>
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
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-inter text-sm font-semibold transition-all duration-300 hover:-translate-y-px"
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
                className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ color: isDarkPage ? 'rgba(255,255,255,0.6)' : '#6B7280' }}
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Menu"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={closeAll} />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="absolute right-0 top-0 bottom-0 w-[88vw] max-w-sm overflow-y-auto pt-24 pb-8 px-5"
              style={{
                background:
                  'radial-gradient(800px 400px at 100% 0%, rgba(212,175,55,0.1), transparent 60%), ' +
                  'radial-gradient(600px 400px at 0% 100%, rgba(75,0,130,0.18), transparent 60%), ' +
                  'linear-gradient(180deg, #07050C 0%, #050308 100%)',
                borderLeft: '1px solid rgba(212,175,55,0.15)',
                boxShadow: '-30px 0 80px rgba(0,0,0,0.6)',
              }}
            >
              <nav className="flex flex-col gap-0.5 mb-6">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <div key={item.href}>
                      {item.children ? (
                        <>
                          <button
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium font-inter text-sm transition-all"
                            style={{ color: isDarkPage ? 'rgba(255,255,255,0.6)' : '#6B7280' }}
                            onClick={() => setActiveDropdown(activeDropdown === item.label ? null : item.label)}
                          >
                            {item.label}
                            <ChevronDown className={cn('w-4 h-4 transition-transform', activeDropdown === item.label && 'rotate-180')} />
                          </button>
                          <AnimatePresence>
                            {activeDropdown === item.label && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden pl-3"
                              >
                                {item.children.map((child) => (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors"
                                    style={{ color: isDarkPage ? 'rgba(255,255,255,0.45)' : '#9CA3AF' }}
                                    onClick={closeAll}
                                  >
                                    <span
                                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                                      style={{ background: `${child.color}18`, border: `1px solid ${child.color}30` }}
                                    >
                                      <child.Icon className="w-3 h-3" style={{ color: child.color }} />
                                    </span>
                                    <span className="font-inter">{child.label}</span>
                                  </Link>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all font-inter"
                          style={{
                            color: isActive
                              ? (isDarkPage ? '#D4AF37' : '#111827')
                              : (isDarkPage ? 'rgba(255,255,255,0.55)' : '#6B7280'),
                            background: isActive
                              ? (isDarkPage ? 'rgba(212,175,55,0.08)' : 'rgba(0,0,0,0.05)')
                              : 'transparent',
                          }}
                          onClick={closeAll}
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                          {item.badge && <span className="badge-live ml-auto text-[9px]">{item.badge}</span>}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </nav>

              <div className="pt-5 border-t flex flex-col gap-2.5"
                style={{ borderColor: isDarkPage ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                {user ? (
                  <Link href={isAdminArea ? '/admin/dashboard' : '/member/dashboard'} onClick={closeAll}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-inter font-semibold text-sm"
                    style={{ background: '#111827', color: '#FFFFFF' }}>
                    {isAdminArea ? 'Back-office' : 'Mon Espace Membre'}
                  </Link>
                ) : (
                  <>
                    <Link href="/rejoindre" onClick={closeAll}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-inter font-semibold text-sm"
                      style={{ background: '#111827', color: '#FFFFFF' }}>
                      Rejoindre la Chapelle
                    </Link>
                    <Link href="/login" onClick={closeAll}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-inter font-medium text-sm border"
                      style={{ borderColor: 'rgba(0,0,0,0.12)', color: '#6B7280', background: 'transparent' }}>
                      Se connecter
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

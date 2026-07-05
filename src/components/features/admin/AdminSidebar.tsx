'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Heart, BookOpen, Calendar, Settings,
  Inbox, Film, FileText, TrendingUp, LogOut, Radio, Mic,
  MessageSquare, HandCoins, Newspaper, Mail, AtSign,
  GraduationCap, Layers, Route, Sparkles, Globe, Activity, Crown, ShoppingBag,
  Command, Globe2, HeartHandshake, ShieldCheck, Megaphone, CalendarCheck, LifeBuoy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'

/**
 * Menu latéral du back-office CMS — modules de gestion de la Citadelle.
 * Les modules de contenu (Pages, Médias, Lives, Podcasts, Enseignements,
 * Événements, Témoignages, Dons) sont administrables et stockés dans Supabase
 * (tables cms_* / giving_*), avec repli statique si Supabase n'est pas configuré.
 */
const NAV_ITEMS = [
  { icon: Command, label: 'Centre de Commandement', href: '/admin/command-center', color: '#F5E6A7' },
  { icon: Globe2, label: 'Commandement Global', href: '/admin/global-command', color: '#F5E6A7' },
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', color: '#D4AF37' },
  { icon: HeartHandshake, label: 'Centre Pastoral', href: '/admin/pastoral', color: '#EC4899' },
  { icon: Crown, label: 'Gouvernement pastoral', href: '/admin/gouvernement', color: '#F5E6A7' },
  { icon: Sparkles, label: 'Gouvernance', href: '/admin/gouvernance', color: '#D4AF37' },
  { icon: Globe, label: 'International', href: '/admin/international', color: '#22C55E' },
  { icon: Globe, label: 'Dashboard par nation', href: '/admin/nation-dashboard', color: '#0EA5E9' },
  { icon: TrendingUp, label: 'Santé spirituelle', href: '/admin/sante-spirituelle', color: '#EC4899' },
  { icon: Activity, label: 'Activités (traçabilité)', href: '/admin/activites', color: '#D4AF37' },
  { icon: Globe, label: 'Cartographie', href: '/admin/cartographie', color: '#0EA5E9' },
  { icon: Users, label: 'Membres', href: '/admin/membres', color: '#60A5FA' },
  { icon: ShieldCheck, label: 'Rôles & accès', href: '/admin/roles', color: '#22C55E' },
  { icon: Megaphone, label: 'Centre Communication', href: '/admin/communication', color: '#EC4899' },
  { icon: Route, label: 'Intégration', href: '/admin/tunnel-integration', color: '#818CF8' },
  { icon: LayoutDashboard, label: 'Accueil (sections)', href: '/admin/homepage-blocks', color: '#D4AF37' },
  { icon: FileText, label: 'Pages', href: '/admin/pages', color: '#14B8A6' },
  { icon: Newspaper, label: 'Articles', href: '/admin/articles', color: '#34D399' },
  { icon: Film, label: 'Médias', href: '/admin/medias', color: '#EF4444' },
  { icon: Radio, label: 'Lives & Cultes', href: '/admin/lives', color: '#F43F5E' },
  { icon: Mic, label: 'Podcasts', href: '/admin/podcasts', color: '#A855F7' },
  { icon: BookOpen, label: 'Enseignements', href: '/admin/enseignements', color: '#8B5CF6' },
  { icon: GraduationCap, label: 'Formations', href: '/admin/formations', color: '#0EA5E9' },
  { icon: Layers, label: 'Modules', href: '/admin/modules', color: '#06B6D4' },
  { icon: Route, label: 'Parcours', href: '/admin/parcours', color: '#A855F7' },
  { icon: MessageSquare, label: 'Questions formations', href: '/admin/questions-formations', color: '#0EA5E9' },
  { icon: Calendar, label: 'Événements', href: '/admin/evenements', color: '#F59E0B' },
  { icon: Calendar, label: 'Inscriptions', href: '/admin/inscriptions', color: '#FBBF24' },
  { icon: MessageSquare, label: 'Témoignages', href: '/admin/temoignages', color: '#22C55E' },
  { icon: HandCoins, label: 'Dons & Offrandes', href: '/admin/dons', color: '#EAB308' },
  { icon: HandCoins, label: 'Transactions', href: '/admin/transactions', color: '#F59E0B' },
  { icon: ShoppingBag, label: 'Marketplace', href: '/admin/marketplace', color: '#D4AF37' },
  { icon: Inbox, label: 'Notifications', href: '/admin/notifications', color: '#FB7185' },
  { icon: Heart, label: 'Prières', href: '/admin/prieres', color: '#F472B6' },
  { icon: Sparkles, label: 'Témoignages exaucés', href: '/admin/temoignages-prieres', color: '#FBBF24' },
  { icon: Heart, label: 'Cure d\'âme', href: '/admin/delivrance', color: '#14B8A6' },
  { icon: Users, label: 'Groupes', href: '/admin/groupes', color: '#F59E0B' },
  { icon: CalendarCheck, label: 'Réunions & Présences', href: '/admin/reunions', color: '#14B8A6' },
  { icon: Mail, label: 'Messages', href: '/admin/messages', color: '#38BDF8' },
  { icon: AtSign, label: 'Newsletter', href: '/admin/newsletter', color: '#FB7185' },
  { icon: Inbox, label: 'Formulaires', href: '/admin/formulaires', color: '#6366F1' },
  { icon: TrendingUp, label: 'Statistiques', href: '/admin/statistiques', color: '#34D399' },
  { icon: TrendingUp, label: 'Analytics', href: '/admin/analytics', color: '#0EA5E9' },
  { icon: Settings, label: 'Paramètres', href: '/admin/parametres', color: '#64748B' },
  { icon: LifeBuoy, label: "Centre d'aide", href: '/admin/aide', color: '#D4AF37' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      router.replace('/admin/login')
      router.refresh()
    }
  }

  return (
    <aside className="flex flex-col h-full py-6 px-3">
      <div className="px-3 mb-6">
        <Link href="/" className="flex items-center gap-2.5 mb-3 group">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-full opacity-40 group-hover:opacity-70 blur-lg transition-opacity duration-500"
              style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
            <Image
              src="/images/logo-mark.png"
              alt="CIER"
              width={36}
              height={36}
              className="relative w-9 h-9 object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.4)]"
            />
          </div>
          <span className="font-cinzel font-bold text-sm tracking-[0.15em] text-gold">CIER</span>
        </Link>
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold/60 font-inter">
            Administration
          </div>
          <NotificationBell endpoint="/api/admin/notifications" storageKey="notif_read_admin" />
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm font-medium transition-all duration-200 relative',
                isActive
                  ? 'bg-white/[0.06] text-pearl'
                  : 'text-pearl/40 hover:text-pearl/80 hover:bg-white/[0.03]'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: item.color }} />
              )}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: isActive ? `${item.color}20` : 'transparent' }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: isActive ? item.color : 'currentColor' }} />
              </div>
              <span className="flex-1">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        className="mt-4 flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm font-medium text-pearl/40 hover:text-danger hover:bg-danger/5 transition-all w-full"
      >
        <div className="w-7 h-7 rounded-lg flex items-center justify-center">
          <LogOut className="w-3.5 h-3.5" />
        </div>
        Déconnexion
      </button>
    </aside>
  )
}

'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, User, BookOpen, Play, FileText,
  Calendar, Heart, Flame, Bell, ChevronRight, LogOut, DollarSign, Users,
  MessageCircle, Settings, Compass, GraduationCap, UserPlus, BookMarked, Newspaper, HeartHandshake, ShoppingBag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/components/providers/AuthProvider'
import { isFormateur, isIntegration } from '@/lib/roles'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/member/dashboard', color: '#D4AF37' },
  { icon: User, label: 'Mon Profil', href: '/member/dashboard/profil', color: '#0EA5E9' },
  { icon: BookOpen, label: 'Mes Formations', href: '/member/dashboard/formations', color: '#8B5CF6' },
  { icon: BookMarked, label: 'La Bible', href: '/member/dashboard/bible', color: '#D4AF37' },
  { icon: GraduationCap, label: 'Enseignements', href: '/enseignements', color: '#8B5CF6' },
  { icon: Newspaper, label: 'Articles', href: '/articles', color: '#0EA5E9' },
  { icon: Play, label: 'Mes Lives', href: '/member/dashboard/lives', color: '#EF4444' },
  { icon: FileText, label: 'Mes Ressources', href: '/member/dashboard/ressources', color: '#22C55E' },
  { icon: Calendar, label: 'Mes Événements', href: '/member/dashboard/evenements', color: '#F59E0B' },
  { icon: Heart, label: 'Mes Prières', href: '/member/dashboard/prieres', color: '#EC4899' },
  { icon: HeartHandshake, label: 'Cure d\'âme', href: '/member/dashboard/delivrance', color: '#14B8A6' },
  { icon: Users, label: 'Mes Groupes', href: '/member/dashboard/groupes', color: '#F97316' },
  { icon: DollarSign, label: 'Mes Dons', href: '/member/dashboard/dons', color: '#22C55E' },
  { icon: ShoppingBag, label: 'Mes Achats', href: '/member/dashboard/achats', color: '#EAB308' },
  { icon: Compass, label: 'Mon Parcours', href: '/member/dashboard/parcours', color: '#EC4899' },
  { icon: Flame, label: 'Mon Engagement', href: '/member/dashboard/engagement', color: '#F97316' },
  { icon: Bell, label: 'Notifications', href: '/member/dashboard/notifications', color: '#6366F1' },
  { icon: MessageCircle, label: 'Messages', href: '/member/dashboard/messages', color: '#0EA5E9' },
  { icon: Settings, label: 'Paramètres', href: '/member/dashboard/parametres', color: '#6B7280' },
]

export function MemberSidebar() {
  const pathname = usePathname()
  const { signOut, role } = useAuth()

  // Liens spécialisés visibles selon le rôle (RBAC).
  const roleItems = [
    isFormateur(role) && { icon: GraduationCap, label: 'Espace Formateur', href: '/member/dashboard/formateur', color: '#8B5CF6' },
    isIntegration(role) && { icon: UserPlus, label: 'Espace Intégration', href: '/member/dashboard/integration', color: '#F59E0B' },
    ['super_admin', 'nation_pastor', 'platform_admin', 'admin', 'pasteur'].includes(String(role)) && { icon: Compass, label: 'Tableau national', href: '/member/dashboard/nation', color: '#22C55E' },
  ].filter(Boolean) as { icon: typeof User; label: string; href: string; color: string; badge?: number }[]
  const items: { icon: typeof User; label: string; href: string; color: string; badge?: number }[] = [...NAV_ITEMS, ...roleItems]

  return (
    <aside className="flex flex-col h-full py-6 px-3">
      {/* Logo section */}
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
        <div className="text-xs font-bold tracking-[0.2em] uppercase text-pearl/20 font-inter">
          Espace Membre
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/member/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm font-medium transition-all duration-200 group relative',
                isActive
                  ? 'bg-white/[0.06] text-pearl'
                  : 'text-pearl/40 hover:text-pearl/80 hover:bg-white/[0.03]'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full"
                  style={{ background: item.color }} />
              )}
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: isActive ? `${item.color}20` : 'transparent',
                }}>
                <item.icon className="w-3.5 h-3.5 transition-colors"
                  style={{ color: isActive ? item.color : 'currentColor' }} />
              </div>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: item.color }}>
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — sign out */}
      <div className="pt-4 border-t border-pearl/5 mt-4">
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-inter text-sm text-pearl/30 hover:text-pearl/60 hover:bg-white/[0.03] transition-all w-full"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center">
            <LogOut className="w-3.5 h-3.5" />
          </div>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

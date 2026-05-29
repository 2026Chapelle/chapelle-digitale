'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Heart, BookOpen,
  Calendar, FileText, MessageSquare, Settings,
  UserCheck, Send, BarChart2, Radio, DollarSign, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', color: '#D4AF37' },
  { icon: TrendingUp, label: 'Analytics', href: '/admin/analytics', color: '#0EA5E9' },
  { icon: Users, label: 'Membres', href: '/admin/membres', color: '#60A5FA' },
  { icon: DollarSign, label: 'Dons & Finances', href: '/admin/dons', color: '#22C55E' },
  { icon: UserCheck, label: 'CRM', href: '/admin/crm', color: '#EC4899' },
  { icon: Send, label: 'Communications', href: '/admin/communications', color: '#6366F1' },
  { icon: Radio, label: 'Live & Streaming', href: '/admin/live', color: '#EF4444' },
  { icon: Heart, label: 'Prières', href: '/admin/prieres', color: '#F472B6' },
  { icon: BookOpen, label: 'Formations', href: '/admin/formations', color: '#8B5CF6' },
  { icon: Calendar, label: 'Événements', href: '/admin/evenements', color: '#F59E0B' },
  { icon: FileText, label: 'Ressources', href: '/admin/ressources', color: '#22C55E' },
  { icon: MessageSquare, label: 'Témoignages', href: '/admin/temoignages', color: '#14B8A6' },
  { icon: BarChart2, label: 'Engagement', href: '/admin/engagement', color: '#F97316' },
  { icon: Settings, label: 'Paramètres', href: '/admin/parametres', color: '#64748B' },
]

export function AdminSidebar() {
  const pathname = usePathname()

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
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-gold/60 font-inter">
          Administration
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
              {item.label === 'Live & Streaming' && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Heart, BookOpen, Calendar, Settings,
  Inbox, Film, FileText, TrendingUp, Radio, Mic, MessageSquare, HandCoins,
  Newspaper, Mail, AtSign, GraduationCap, Layers, Route, type LucideIcon,
} from 'lucide-react'

type Item = { icon: LucideIcon; label: string; href: string; color: string; live?: boolean }
const NAV_ITEMS: Item[] = [
  { icon: LayoutDashboard, label: 'Dashboard',     href: '/admin/dashboard',     color: '#D4AF37' },
  { icon: Users,           label: 'Membres',       href: '/admin/membres',       color: '#60A5FA' },
  { icon: FileText,        label: 'Pages',         href: '/admin/pages',         color: '#14B8A6' },
  { icon: Newspaper,       label: 'Articles',      href: '/admin/articles',      color: '#34D399' },
  { icon: Film,            label: 'Médias',        href: '/admin/medias',        color: '#EF4444' },
  { icon: Radio,           label: 'Lives',         href: '/admin/lives',         color: '#F43F5E' },
  { icon: Mic,             label: 'Podcasts',      href: '/admin/podcasts',      color: '#A855F7' },
  { icon: BookOpen,        label: 'Enseignements', href: '/admin/enseignements', color: '#8B5CF6' },
  { icon: GraduationCap,   label: 'Formations',    href: '/admin/formations',    color: '#0EA5E9' },
  { icon: Layers,          label: 'Modules',       href: '/admin/modules',       color: '#06B6D4' },
  { icon: Route,           label: 'Parcours',      href: '/admin/parcours',      color: '#A855F7' },
  { icon: Calendar,        label: 'Événements',    href: '/admin/evenements',    color: '#F59E0B' },
  { icon: Calendar,        label: 'Inscriptions',  href: '/admin/inscriptions',  color: '#FBBF24' },
  { icon: MessageSquare,   label: 'Témoignages',   href: '/admin/temoignages',   color: '#22C55E' },
  { icon: HandCoins,       label: 'Dons',          href: '/admin/dons',          color: '#EAB308' },
  { icon: Heart,           label: 'Prières',       href: '/admin/prieres',       color: '#F472B6' },
  { icon: Users,           label: 'Groupes',       href: '/admin/groupes',       color: '#F59E0B' },
  { icon: Mail,            label: 'Messages',      href: '/admin/messages',      color: '#38BDF8' },
  { icon: AtSign,          label: 'Newsletter',    href: '/admin/newsletter',    color: '#FB7185' },
  { icon: Inbox,           label: 'Formulaires',   href: '/admin/formulaires',   color: '#6366F1' },
  { icon: TrendingUp,      label: 'Statistiques',  href: '/admin/statistiques',  color: '#34D399' },
  { icon: TrendingUp,      label: 'Analytics',     href: '/admin/analytics',     color: '#0EA5E9' },
  { icon: Settings,        label: 'Paramètres',    href: '/admin/parametres',    color: '#64748B' },
]

export function MobileAdminBar() {
  const pathname = usePathname()
  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-30 border-b"
      style={{
        top: '80px',
        background: 'rgba(5,0,15,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'rgba(212,175,55,0.1)',
      }}
    >
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-3 py-2.5">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-inter font-medium whitespace-nowrap transition-all"
              style={{
                background: isActive ? `${item.color}18` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? `${item.color}45` : 'rgba(255,255,255,0.06)'}`,
                color: isActive ? item.color : 'rgba(255,255,255,0.55)',
                boxShadow: isActive ? `0 4px 12px ${item.color}25` : 'none',
              }}
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{item.label}</span>
              {item.live && (
                <span className="relative flex w-1.5 h-1.5 ml-0.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-70 animate-ping" />
                  <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-500" />
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

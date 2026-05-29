'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Play, Heart, MessageCircle, User
} from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Accueil', href: '/member/dashboard' },
  { icon: BookOpen, label: 'Formations', href: '/member/dashboard/formations' },
  { icon: Play, label: 'Lives', href: '/member/dashboard/lives' },
  { icon: Heart, label: 'Prières', href: '/member/dashboard/prieres' },
  { icon: MessageCircle, label: 'Messages', href: '/member/dashboard/messages', badge: 2 },
  { icon: User, label: 'Profil', href: '/member/dashboard/profil' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex items-center justify-around px-2 py-2 safe-area-pb"
      style={{
        background: 'rgba(5,0,15,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href ||
          (item.href !== '/member/dashboard' && pathname.startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 relative min-w-[44px]"
            style={{
              color: isActive ? '#D4AF37' : 'rgba(255,255,255,0.35)',
            }}
          >
            {isActive && (
              <div
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                style={{ background: '#D4AF37' }}
              />
            )}
            <div className="relative">
              <item.icon className="w-5 h-5" />
              {'badge' in item && item.badge && (
                <div
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: '#EF4444' }}
                >
                  {item.badge}
                </div>
              )}
            </div>
            <span className="text-[9px] font-inter font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

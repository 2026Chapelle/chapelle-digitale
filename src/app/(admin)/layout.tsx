'use client'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { AdminSidebar } from '@/components/features/admin/AdminSidebar'
import { MobileAdminBar } from '@/components/features/admin/MobileAdminBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // La page de connexion s'affiche en plein écran, sans la nav ni la sidebar.
  if (pathname === '/admin/login') {
    return <main id="main-content" tabIndex={-1}>{children}</main>
  }

  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-abyss">
        <div className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed left-0 bottom-0 border-r border-white/[0.04] overflow-y-auto"
          style={{ top: '80px' }}>
          <AdminSidebar />
        </div>
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 lg:ml-60">
          <MobileAdminBar />
          {/* Spacer reserves vertical space on mobile so the fixed bar doesn't overlap page content */}
          <div className="lg:hidden h-[52px]" aria-hidden />
          {children}
        </main>
      </div>
    </>
  )
}

import { Navbar } from '@/components/layout/Navbar'
import { MemberSidebar } from '@/components/features/member/MemberSidebar'
import { MobileBottomNav } from '@/components/features/member/MobileBottomNav'

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen bg-abyss">
        {/* Sidebar — desktop */}
        <div className="hidden lg:flex flex-col w-60 flex-shrink-0 fixed left-0 bottom-0 border-r border-white/[0.04] overflow-y-auto"
          style={{ top: '80px' }}>
          <MemberSidebar />
        </div>
        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 lg:ml-60 pb-20 lg:pb-0">
          {children}
        </main>
      </div>
      {/* Mobile navigation */}
      <MobileBottomNav />
    </>
  )
}

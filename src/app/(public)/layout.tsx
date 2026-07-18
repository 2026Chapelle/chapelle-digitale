import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BackToTopButton } from '@/components/ui/BackToTopButton'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>{children}</main>
      <Footer />
      <BackToTopButton />
    </>
  )
}

import Link from 'next/link'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-abyss">
      {/* Minimal header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center h-16 px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Image
            src="/images/logo-mark.png"
            alt="CIER — La Chapelle Internationale des Élus du Royaume"
            width={32}
            height={32}
            className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(212,175,55,0.45)]"
          />
          <span className="font-cinzel text-sm font-bold text-gradient-gold">CIER</span>
        </Link>
      </div>
      <main id="main-content" tabIndex={-1}>{children}</main>
    </div>
  )
}

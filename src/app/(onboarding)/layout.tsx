import Image from 'next/image'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-cinematic-deep">
      {/* Cinematic halos */}
      <div className="halo-gold w-[800px] h-[500px] -top-20 right-0" />
      <div className="halo-royal w-[600px] h-[400px] bottom-0 -left-32" />

      {/* Vertical light beam */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full opacity-30 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(212,175,55,0.5) 30%, transparent)' }}
      />

      {/* Stars */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
        backgroundImage:
          'radial-gradient(1px 1px at 20% 20%, rgba(245,230,167,0.6), transparent), ' +
          'radial-gradient(1px 1px at 80% 30%, rgba(245,230,167,0.4), transparent), ' +
          'radial-gradient(1px 1px at 35% 60%, rgba(255,255,255,0.5), transparent), ' +
          'radial-gradient(1.5px 1.5px at 70% 75%, rgba(212,175,55,0.5), transparent)',
        backgroundSize: '600px 600px',
      }} />

      {/* Minimal header */}
      <header className="flex items-center justify-center py-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full blur-xl opacity-50"
              style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
            <Image
              src="/images/logo-mark.png"
              alt="CIER — La Chapelle Internationale des Élus du Royaume"
              width={40}
              height={40}
              priority
              className="relative w-10 h-10 object-contain drop-shadow-[0_2px_10px_rgba(212,175,55,0.45)]"
            />
          </div>
          <div>
            <div className="font-cinzel font-bold text-sm tracking-[0.15em]"
              style={{ color: '#F5E6A7' }}>CIER</div>
            <div className="font-inter text-[9px] tracking-[0.25em] uppercase"
              style={{ color: 'rgba(245,230,216,0.4)' }}>
              Bienvenue
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="relative z-10">{children}</main>
    </div>
  )
}

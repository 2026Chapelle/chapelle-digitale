'use client'

import { useEffect, useRef } from 'react'

/* ============================================================
   ÉTINCELLES & PARTICULES DORÉES — canvas léger, zéro dépendance
   ------------------------------------------------------------
   Choix de mise en œuvre, dictés par la performance mobile :
   - densité proportionnelle à la surface, mais plafonnée (36 max, 16 sur
     petit écran) : le coût reste constant quel que soit l'écran ;
   - `devicePixelRatio` plafonné à 2 — au-delà, on peint 3× plus de pixels
     pour un gain invisible ;
   - l'animation est mise en pause par IntersectionObserver dès que la
     section sort du viewport, et à l'`visibilitychange` de l'onglet ;
   - `prefers-reduced-motion: reduce` → aucune boucle, aucun canvas monté :
     on rend une nappe statique discrète à la place ;
   - `aria-hidden` : purement décoratif, invisible pour les lecteurs d'écran.
   ============================================================ */

type Particle = {
  x: number
  y: number
  r: number
  vy: number
  vx: number
  phase: number
  speed: number
  hue: 'or' | 'braise' | 'clair'
}

const COLORS: Record<Particle['hue'], string> = {
  or: '212, 175, 110',
  braise: '255, 140, 0',
  clair: '255, 255, 255',
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    'matchMedia' in window &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function GoldenSparkles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prefersReducedMotion()) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let raf = 0
    let running = false
    let last = performance.now()

    /* Explosion d'ouverture : au premier rendu seulement, les particules sont
       plus nombreuses, plus vives et plus rapides, puis retombent en ~1,6 s
       vers le régime de croisière (lent et discret). `burst` décroît de 1 → 0
       et module densité, vitesse et opacité. Aucun confetti, aucune couleur
       hors palette, aucun son. */
    const BURST_MS = 1600
    let burstStart = performance.now()
    const burstAt = (now: number) => {
      const t = (now - burstStart) / BURST_MS
      if (t >= 1) return 0
      // Décroissance douce (ease-out cubique) plutôt que linéaire.
      return (1 - t) ** 3
    }

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Densité de croisière, plafonnée : le coût reste constant quel que soit
      // l'écran. L'explosion initiale se joue sur l'opacité et la vitesse, pas
      // sur un surcroît de particules — la charge CPU ne monte donc jamais.
      const compact = width < 640
      const count = Math.min(compact ? 22 : 46, Math.round((width * height) / 20_000))

      particles = Array.from({ length: Math.max(count, 10) }, (_, i) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.7 + Math.random() * 1.7,
        vy: -(4 + Math.random() * 14),
        vx: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.1,
        hue: i % 7 === 0 ? 'braise' : i % 3 === 0 ? 'clair' : 'or',
      }))
    }

    const draw = (now: number) => {
      // Delta borné : après un onglet en arrière-plan, on ne rattrape pas
      // des secondes de simulation d'un coup.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const burst = burstAt(now)
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        // Pendant l'explosion, les particules montent plus vite puis ralentissent.
        const rush = 1 + burst * 2.6
        p.y += p.vy * dt * rush
        p.x += p.vx * dt * rush
        p.phase += p.speed * dt * (1 + burst)

        // Recyclage par le bas quand la particule sort par le haut.
        if (p.y < -12) {
          p.y = height + 12
          p.x = Math.random() * width
        }
        if (p.x < -12) p.x = width + 12
        if (p.x > width + 12) p.x = -12

        // Scintillement : opacité pulsée, jamais nulle pour éviter le clignotement.
        const twinkle = 0.28 + 0.42 * (0.5 + 0.5 * Math.sin(p.phase * 2))
        // Fondu vertical : les particules s'éteignent en haut de la zone.
        const fade = Math.min(1, (height - p.y) / (height * 0.35), p.y / (height * 0.18) + 0.2)
        // L'explosion éclaire (jusqu'à ×2,1) puis retombe au régime discret.
        const alpha = Math.min(twinkle * Math.max(fade, 0) * (1 + burst * 1.1), 1)
        const glow = p.r * (5 + burst * 3)
        const rgb = COLORS[p.hue]

        const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow)
        halo.addColorStop(0, `rgba(${rgb}, ${alpha})`)
        halo.addColorStop(1, `rgba(${rgb}, 0)`)
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(${rgb}, ${Math.min(alpha * 1.5, 0.95)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (1 + burst * 0.5), 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(draw)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    build()
    start()

    const onResize = () => {
      build()
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    // Pause dès que la section quitte le viewport : aucun cycle CPU gaspillé
    // pendant que le visiteur lit le bas de la page.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    )
    io.observe(canvas)

    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div aria-hidden className={className}>
      {/* Nappe statique, TOUJOURS rendue et placée sous le canvas (qui est
          transparent). C'est elle qui porte la texture dorée quand le canvas
          ne tourne pas : animations réduites, ou canvas indisponible. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(1.5px 1.5px at 18% 26%, rgba(240,220,174,0.5), transparent), ' +
            'radial-gradient(1px 1px at 74% 34%, rgba(255,255,255,0.4), transparent), ' +
            'radial-gradient(1.5px 1.5px at 36% 68%, rgba(212,175,110,0.45), transparent), ' +
            'radial-gradient(1px 1px at 62% 78%, rgba(240,220,174,0.35), transparent), ' +
            'radial-gradient(1.5px 1.5px at 88% 60%, rgba(255,140,0,0.28), transparent)',
          backgroundSize: '600px 600px',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  )
}

/**
 * Section « Présence internationale » (V2.7-A.1) — globe premium ÉPURÉ en CSS/SVG léger.
 * Pas de cartes de pays, pas de silhouettes de continents, aucun label géographique ni
 * bloc de données inventé. Rendu propre : lumière, grille, texture pointillée d'océan,
 * halo atmosphérique, rotation lente, profondeur. Aucune dépendance lourde.
 * Composant serveur statique ; animations respectant prefers-reduced-motion.
 */
import { Globe2 } from 'lucide-react'

// Signaux lumineux génériques (aucun label, aucune donnée géographique).
const PULSES = [
  { top: '52%', left: '46%', delay: '0s' },
  { top: '38%', left: '58%', delay: '1s' },
  { top: '60%', left: '60%', delay: '2s' },
]

// CSS injecté via dangerouslySetInnerHTML : évite l'échappement des quotes de `content: ''`
// (sinon hydration mismatch server/client sur le <style>).
const GLOBE_CSS = `
  @keyframes citadelleGlobeSpin { to { transform: rotate(360deg); } }
  @keyframes citadellePulse { 0% { transform: scale(0.6); opacity: 0.9; } 70% { transform: scale(2.4); opacity: 0; } 100% { opacity: 0; } }
  .citadelle-globe-rotate { transform-origin: 100px 100px; animation: citadelleGlobeSpin 60s linear infinite; }
  @media (prefers-reduced-motion: reduce) {
    .citadelle-globe-rotate { animation: none; }
    .citadelle-pulse::after { animation: none; }
  }
  .citadelle-pulse::after {
    content: ""; position: absolute; inset: 0; border-radius: 9999px;
    background: rgba(212,175,55,0.5); animation: citadellePulse 3s ease-out infinite;
  }
`

export function GlobalPresenceSection() {
  return (
    <section className="py-20 sm:py-24 overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: GLOBE_CSS }} />
      <div className="container-royal grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
            <Globe2 className="w-3.5 h-3.5" /> International
          </div>
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl leading-tight mb-4">
            Une vision locale, <span className="text-cinematic-gold">une portée internationale</span>
          </h2>
          <p className="font-inter text-pearl/70 leading-relaxed max-w-lg">
            Depuis Abidjan, La Citadelle accompagne une famille spirituelle appelée à rayonner dans les nations —
            une même foi, portée au-delà des frontières.
          </p>
        </div>

        {/* Globe épuré */}
        <div className="flex justify-center">
          <div className="relative w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] lg:w-[520px] lg:h-[520px]">
            <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle at 50% 42%, rgba(212,175,55,0.3), transparent 62%)' }} />
            <div className="absolute inset-0 rounded-full overflow-hidden border border-gold/20"
              style={{ background: 'radial-gradient(circle at 34% 26%, #1e1740 0%, #0b0819 52%, #050308 100%)', boxShadow: 'inset -30px -30px 90px rgba(0,0,0,0.8), inset 24px 20px 60px rgba(120,140,220,0.06), 0 40px 130px rgba(0,0,0,0.6)' }}>
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" fill="none" aria-hidden>
                <defs>
                  <clipPath id="citadelleGlobeClip"><circle cx="100" cy="100" r="98" /></clipPath>
                  <pattern id="citadelleDots" width="5" height="5" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.5" fill="rgba(150,170,220,0.14)" />
                  </pattern>
                </defs>
                {/* Océan texturé */}
                <circle cx="100" cy="100" r="98" fill="url(#citadelleDots)" clipPath="url(#citadelleGlobeClip)" />
                {/* Grille longitude/latitude en rotation lente */}
                <g className="citadelle-globe-rotate" clipPath="url(#citadelleGlobeClip)">
                  <ellipse cx="100" cy="100" rx="98" ry="33" stroke="rgba(212,175,55,0.12)" />
                  <ellipse cx="100" cy="100" rx="98" ry="66" stroke="rgba(212,175,55,0.09)" />
                  <ellipse cx="100" cy="100" rx="33" ry="98" stroke="rgba(212,175,55,0.12)" />
                  <ellipse cx="100" cy="100" rx="66" ry="98" stroke="rgba(212,175,55,0.09)" />
                  <circle cx="100" cy="100" r="98" stroke="rgba(212,175,55,0.1)" />
                  <line x1="2" y1="100" x2="198" y2="100" stroke="rgba(212,175,55,0.12)" />
                </g>
                {/* Reflet atmosphérique + liseré */}
                <circle cx="72" cy="66" r="30" fill="rgba(255,255,255,0.05)" clipPath="url(#citadelleGlobeClip)" />
                <circle cx="100" cy="100" r="98" stroke="rgba(212,175,55,0.22)" />
              </svg>
              {/* Signaux lumineux génériques (sans label) */}
              {PULSES.map((p, i) => (
                <span key={i} className="citadelle-pulse absolute w-3 h-3" style={{ top: p.top, left: p.left, animationDelay: p.delay }}>
                  <span className="absolute inset-0 rounded-full" style={{ background: '#F5E6A7', boxShadow: '0 0 14px rgba(245,230,167,0.95)' }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

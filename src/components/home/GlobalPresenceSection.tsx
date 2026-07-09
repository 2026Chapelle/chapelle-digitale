/**
 * Section « Présence internationale » (V2.7-A) — globe premium en CSS/SVG léger
 * (rotation douce + points pulsés). Aucune dépendance lourde (pas de Three.js).
 * Pays « représentés ou en connexion avec la vision » (formulation prudente).
 * Composant serveur statique ; animations respectant prefers-reduced-motion.
 */
import { Globe2 } from 'lucide-react'

const representedCountries = [
  { name: 'Côte d’Ivoire', city: 'Abidjan' },
  { name: 'France', city: 'Paris' },
  { name: 'Canada', city: 'Montréal' },
]

// Points lumineux (positions relatives sur le disque, en %).
const PULSES = [
  { top: '46%', left: '30%', delay: '0s' },
  { top: '38%', left: '58%', delay: '0.8s' },
  { top: '62%', left: '52%', delay: '1.6s' },
]

export function GlobalPresenceSection() {
  return (
    <section className="py-20 sm:py-24 overflow-hidden">
      <style>{`
        @keyframes citadelleGlobeSpin { to { transform: rotate(360deg); } }
        @keyframes citadellePulse { 0% { transform: scale(0.6); opacity: 0.9; } 70% { transform: scale(2.4); opacity: 0; } 100% { opacity: 0; } }
        .citadelle-globe-grid { animation: citadelleGlobeSpin 40s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .citadelle-globe-grid { animation: none; }
          .citadelle-pulse::after { animation: none; }
        }
        .citadelle-pulse::after {
          content: ''; position: absolute; inset: 0; border-radius: 9999px;
          background: rgba(212,175,55,0.55); animation: citadellePulse 3s ease-out infinite;
        }
      `}</style>
      <div className="container-royal grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-inter mb-4" style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37' }}>
            <Globe2 className="w-3.5 h-3.5" /> International
          </div>
          <h2 className="font-cinzel font-bold text-2xl sm:text-3xl leading-tight mb-4">
            Une vision locale, <span className="text-cinematic-gold">une portée internationale</span>
          </h2>
          <p className="font-inter text-pearl/70 leading-relaxed mb-7 max-w-lg">
            Depuis Abidjan, La Citadelle accompagne une famille spirituelle appelée à rayonner dans les nations.
          </p>
          <p className="text-[11px] uppercase tracking-wider text-pearl/35 font-inter mb-3">Pays représentés ou en connexion avec la vision</p>
          <ul className="space-y-2.5">
            {representedCountries.map((c) => (
              <li key={c.name} className="flex items-center gap-3 font-inter text-sm text-pearl/80">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#D4AF37', boxShadow: '0 0 10px rgba(212,175,55,0.7)' }} />
                <span className="text-pearl/90">{c.name}</span>
                <span className="text-pearl/40 text-xs">· {c.city}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Globe */}
        <div className="flex justify-center">
          <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px]">
            <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(212,175,55,0.25), transparent 60%)' }} />
            <div className="absolute inset-0 rounded-full overflow-hidden border border-gold/15"
              style={{ background: 'radial-gradient(circle at 35% 30%, #1a1330 0%, #0a0716 55%, #050308 100%)', boxShadow: 'inset -18px -18px 60px rgba(0,0,0,0.7), 0 30px 90px rgba(0,0,0,0.6)' }}>
              {/* Grille de longitude/latitude en rotation */}
              <svg className="citadelle-globe-grid absolute inset-0 w-full h-full" viewBox="0 0 200 200" fill="none" aria-hidden>
                <circle cx="100" cy="100" r="96" stroke="rgba(212,175,55,0.16)" />
                <ellipse cx="100" cy="100" rx="96" ry="34" stroke="rgba(212,175,55,0.12)" />
                <ellipse cx="100" cy="100" rx="96" ry="66" stroke="rgba(212,175,55,0.1)" />
                <ellipse cx="100" cy="100" rx="34" ry="96" stroke="rgba(212,175,55,0.12)" />
                <ellipse cx="100" cy="100" rx="66" ry="96" stroke="rgba(212,175,55,0.1)" />
                <line x1="4" y1="100" x2="196" y2="100" stroke="rgba(212,175,55,0.14)" />
              </svg>
              {/* Points pulsés (villes) */}
              {PULSES.map((p, i) => (
                <span key={i} className="citadelle-pulse absolute w-2.5 h-2.5" style={{ top: p.top, left: p.left, animationDelay: p.delay }}>
                  <span className="absolute inset-0 rounded-full" style={{ background: '#F5E6A7', boxShadow: '0 0 12px rgba(245,230,167,0.9)' }} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

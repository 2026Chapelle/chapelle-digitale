/**
 * Section « Présence internationale » (V2.7-A.4) — GLOBE IMAGE léger, stable mobile.
 *
 * Réécriture volontairement minimale pour ne PLUS jamais bloquer les appareils Samsung :
 *   - une seule image réelle : public/images/home/globe-nations.webp (PNG 1280×720) ;
 *   - conteneur carré + circulaire, `object-cover object-center` (recadrage naturel) ;
 *   - rotation lente par un simple `transform: rotate()` (linéaire, infinie) ;
 *   - 14 « lumières des nations » (constellation symbolique) pulsant en opacity + scale.
 *
 * Interdits stricts respectés dans ce composant : aucun SVG de globe, aucun canvas,
 * aucun WebGL/Three.js, aucun `filter: blur`, aucun `backdrop-filter`, aucun `blur-3xl`,
 * aucune ombre géante animée, aucune dépendance supplémentaire.
 *
 * Accessibilité : `prefers-reduced-motion: reduce` coupe rotation ET pulsations.
 * Composant serveur statique (aucun hook, aucune API client).
 */
import { Globe2 } from 'lucide-react'

// Constellation SYMBOLIQUE des nations où des drapeaux apparaissent réellement sur les
// pages publiques (MovementSection + Contact). Positions décoratives — ce n'est PAS une
// cartographie exacte. Aucun chiffre, aucune statistique. Exactement 14 lumières.
const NATION_LIGHTS = [
  { name: 'RDC',            flag: '🇨🇩', top: '30%', left: '44%', delay: '0s'   },
  { name: 'France',         flag: '🇫🇷', top: '21%', left: '61%', delay: '0.4s' },
  { name: 'Belgique',       flag: '🇧🇪', top: '37%', left: '72%', delay: '0.8s' },
  { name: 'Canada',         flag: '🇨🇦', top: '18%', left: '33%', delay: '1.2s' },
  { name: "Côte d'Ivoire",  flag: '🇨🇮', top: '55%', left: '39%', delay: '1.6s' },
  { name: 'Cameroun',       flag: '🇨🇲', top: '48%', left: '57%', delay: '2s'   },
  { name: 'Ghana',          flag: '🇬🇭', top: '63%', left: '51%', delay: '2.4s' },
  { name: 'Sénégal',        flag: '🇸🇳', top: '43%', left: '27%', delay: '2.8s' },
  { name: 'Suisse',         flag: '🇨🇭', top: '29%', left: '68%', delay: '0.2s' },
  { name: 'Royaume-Uni',    flag: '🇬🇧', top: '25%', left: '49%', delay: '0.6s' },
  { name: 'États-Unis',     flag: '🇺🇸', top: '41%', left: '18%', delay: '1s'   },
  { name: 'Allemagne',      flag: '🇩🇪', top: '20%', left: '77%', delay: '1.4s' },
  { name: 'Gabon',          flag: '🇬🇦', top: '68%', left: '61%', delay: '1.8s' },
  { name: 'Italie',         flag: '🇮🇹', top: '58%', left: '74%', delay: '2.2s' },
]

// CSS injecté via dangerouslySetInnerHTML (quotes de `content` non échappées → pas de
// mismatch d'hydratation). Rotation : 120s mobile, 90s dès 768px. Pulsations légères.
const GLOBE_CSS = `
  @keyframes citadelleGlobeSpin { to { transform: rotate(360deg); } }
  @keyframes citadelleNationPulse {
    0%, 100% { opacity: 0.35; transform: translate(-50%, -50%) scale(0.82); }
    50%      { opacity: 1;    transform: translate(-50%, -50%) scale(1.18); }
  }
  .citadelle-globe-rotate {
    animation: citadelleGlobeSpin 120s linear infinite;
    will-change: transform;
  }
  @media (min-width: 768px) {
    .citadelle-globe-rotate { animation-duration: 90s; }
  }
  .citadelle-nation {
    transform: translate(-50%, -50%);
    animation: citadelleNationPulse 3.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .citadelle-globe-rotate { animation: none; }
    .citadelle-nation { animation: none; opacity: 0.85; }
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

        {/* Globe image — carré, circulaire ; diamètre borné (≈300px mobile, ≈460px desktop).
            `max-w` en vw pour garantir zéro débordement horizontal sur petits écrans. */}
        <div className="flex justify-center">
          <div className="relative aspect-square w-[300px] max-w-[82vw] md:w-[460px] md:max-w-none">
            {/* Image en rotation (seule transformation appliquée). */}
            <div className="citadelle-globe-rotate absolute inset-0 rounded-full overflow-hidden">
              {/* <img> simple : aucune dépendance, aucun domaine à déclarer, pas de conversion. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/home/globe-nations.webp"
                alt="Globe terrestre — la portée internationale de La Citadelle"
                width={460}
                height={460}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center select-none"
                draggable={false}
              />
            </div>

            {/* 14 lumières des nations — constellation symbolique, fixes (ne tournent pas).
                Pulsations opacity + scale uniquement ; petite lueur fixe autorisée (pas de blur). */}
            {NATION_LIGHTS.map((n) => (
              <span
                key={n.name}
                role="img"
                title={`${n.name} ${n.flag}`}
                aria-label={`${n.name} ${n.flag}`}
                className="citadelle-nation absolute block w-[7px] h-[7px] rounded-full"
                style={{
                  top: n.top,
                  left: n.left,
                  animationDelay: n.delay,
                  background: '#F5E6A7',
                  boxShadow: '0 0 8px 2px rgba(245,230,167,0.75)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

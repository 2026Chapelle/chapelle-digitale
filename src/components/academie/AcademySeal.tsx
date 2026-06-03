'use client'
/**
 * AcademySeal — sceau premium de l'Académie des Élus (rendu vectoriel).
 *
 * Le logo OR reste celui de la Chapelle (institution). Le sceau VIOLET est le
 * sceau ACADÉMIQUE (badges, certificats, diplôme). Décliné en 3 variantes :
 *  - violet : badges & sceau académique courant
 *  - argent : mentions intermédiaires
 *  - or     : diplôme suprême / excellence
 * Remplaçable par le logo violet officiel (image) sans changer l'API.
 */

export type SealVariant = 'violet' | 'argent' | 'or'

const PALETTE: Record<SealVariant, { a: string; b: string; ring: string; ink: string }> = {
  violet: { a: '#A855F7', b: '#6D28D9', ring: '#7C3AED', ink: '#F5E9FF' },
  argent: { a: '#E8E8EC', b: '#9CA3AF', ring: '#C0C0C8', ink: '#1A1A22' },
  or: { a: '#F5E6A7', b: '#D4AF37', ring: '#B8910F', ink: '#1A0F00' },
}

export function AcademySeal({ variant = 'violet', size = 120, label = "Académie des Élus" }: { variant?: SealVariant; size?: number; label?: string }) {
  const c = PALETTE[variant]
  const id = `seal-${variant}`
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={`Sceau ${label}`}>
      <defs>
        <radialGradient id={`${id}-fill`} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor={c.a} />
          <stop offset="100%" stopColor={c.b} />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.a} />
          <stop offset="100%" stopColor={c.ring} />
        </linearGradient>
        <path id={`${id}-top`} d="M 100,100 m -74,0 a 74,74 0 1 1 148,0" fill="none" />
        <path id={`${id}-bot`} d="M 100,100 m 74,0 a 74,74 0 1 1 -148,0" fill="none" />
      </defs>

      {/* Couronne crantée */}
      {Array.from({ length: 48 }).map((_, i) => {
        const ang = (i / 48) * Math.PI * 2
        const r1 = 92, r2 = 99
        return <line key={i} x1={100 + Math.cos(ang) * r1} y1={100 + Math.sin(ang) * r1} x2={100 + Math.cos(ang) * r2} y2={100 + Math.sin(ang) * r2} stroke={c.ring} strokeWidth="2" opacity="0.7" />
      })}

      <circle cx="100" cy="100" r="90" fill={`url(#${id}-rim)`} />
      <circle cx="100" cy="100" r="80" fill="#0b0716" opacity={variant === 'argent' ? 0.12 : 0.18} />
      <circle cx="100" cy="100" r="80" fill="none" stroke={c.ink} strokeWidth="1" opacity="0.35" />

      {/* Texte circulaire */}
      <text fontFamily="Cinzel, serif" fontWeight="700" fontSize="13" letterSpacing="3" fill={c.ink}>
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">ACADÉMIE DES ÉLUS</textPath>
      </text>
      <text fontFamily="Cinzel, serif" fontWeight="700" fontSize="11" letterSpacing="4" fill={c.ink} opacity="0.85">
        <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">· CFIC · ROYAUME ·</textPath>
      </text>

      {/* Cœur : disque + couronne + monogramme */}
      <circle cx="100" cy="100" r="52" fill={`url(#${id}-fill)`} stroke={c.ink} strokeWidth="1.5" opacity="0.95" />
      {/* Couronne stylisée */}
      <path d="M 78,108 L 74,84 L 86,96 L 100,78 L 114,96 L 126,84 L 122,108 Z" fill={c.ink} opacity="0.9" />
      <circle cx="74" cy="82" r="3" fill={c.ink} /><circle cx="100" cy="74" r="3.5" fill={c.ink} /><circle cx="126" cy="82" r="3" fill={c.ink} />
      {/* Monogramme AER */}
      <text x="100" y="128" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="900" fontSize="22" letterSpacing="2" fill={c.ink}>AER</text>
    </svg>
  )
}

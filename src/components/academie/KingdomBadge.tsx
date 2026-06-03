'use client'
import { motion } from 'framer-motion'
import { Crown, Lock } from 'lucide-react'

/* ============================================================
   KingdomBadge — sceau de badge du Royaume (rendu vectoriel premium).
   Le NOM du badge est réel (ex. « Né du Royaume ») ; le visuel est un
   sceau designé (aucun asset image n'étant fourni). Remplaçable par une
   image officielle plus tard sans changer l'API.
   ============================================================ */

export function KingdomBadge({
  label, obtained = false, size = 96, couleur = '#D4AF37',
}: { label: string; obtained?: boolean; size?: number; couleur?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" style={{ width: size + 24 }}>
      <motion.div
        initial={obtained ? { scale: 0.7, rotate: -10, opacity: 0 } : false}
        animate={obtained ? { scale: 1, rotate: 0, opacity: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size, height: size,
          background: obtained
            ? `radial-gradient(circle at 50% 30%, ${couleur}, #92721A 70%, #5c4810)`
            : 'rgba(255,255,255,0.04)',
          border: obtained ? `2px solid #F5E6A7` : '1.5px solid rgba(255,255,255,0.12)',
          boxShadow: obtained ? `0 0 36px ${couleur}66, inset 0 2px 8px rgba(255,255,255,0.4)` : 'none',
        }}
      >
        {/* Couronne de rayons */}
        {obtained && (
          <div className="absolute inset-0 rounded-full" aria-hidden style={{
            background: `conic-gradient(from 0deg, transparent 0 8deg, ${couleur}22 8deg 10deg, transparent 10deg 30deg)`,
            opacity: 0.5,
          }} />
        )}
        {obtained
          ? <Crown className="relative" style={{ width: size * 0.4, height: size * 0.4, color: '#FFF8E1' }} fill="#F5E6A7" />
          : <Lock className="relative" style={{ width: size * 0.32, height: size * 0.32, color: 'rgba(245,230,216,0.3)' }} />}
        {/* Liseré intérieur */}
        {obtained && <div className="absolute rounded-full" aria-hidden style={{ inset: size * 0.12, border: '1px solid rgba(255,248,225,0.35)' }} />}
      </motion.div>
      <span className="font-cinzel text-xs font-bold text-center leading-tight"
        style={{ color: obtained ? '#F5E6A7' : 'rgba(245,230,216,0.35)' }}>
        {label}
      </span>
      {!obtained && <span className="font-inter text-[10px]" style={{ color: 'rgba(245,230,216,0.3)' }}>À débloquer</span>}
    </div>
  )
}

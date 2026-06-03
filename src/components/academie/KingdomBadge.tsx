'use client'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { AcademySeal } from './AcademySeal'

/* ============================================================
   KingdomBadge — badge de module officiel, dérivé du SCEAU ACADÉMIQUE
   VIOLET (AcademySeal). M1 = « Né du Royaume ». Le nom est réel ; le sceau
   violet sert d'identité visuelle (remplaçable par le logo violet officiel).
   ============================================================ */

export function KingdomBadge({ label, obtained = false, size = 96 }: { label: string; obtained?: boolean; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2.5" style={{ width: size + 28 }}>
      <motion.div
        initial={obtained ? { scale: 0.7, rotate: -8, opacity: 0 } : false}
        animate={obtained ? { scale: 1, rotate: 0, opacity: 1 } : {}}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
        style={{
          filter: obtained ? 'drop-shadow(0 0 22px rgba(124,58,237,0.5))' : 'grayscale(0.8)',
          opacity: obtained ? 1 : 0.4,
        }}
      >
        <AcademySeal variant="violet" size={size} label={label} />
        {!obtained && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(10,7,22,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Lock className="w-4 h-4" style={{ color: 'rgba(245,230,216,0.55)' }} />
            </span>
          </div>
        )}
      </motion.div>
      <span className="font-cinzel text-xs font-bold text-center leading-tight" style={{ color: obtained ? '#D8B4FE' : 'rgba(245,230,216,0.35)' }}>
        {label}
      </span>
      {!obtained && <span className="font-inter text-[10px]" style={{ color: 'rgba(245,230,216,0.3)' }}>À débloquer</span>}
    </div>
  )
}

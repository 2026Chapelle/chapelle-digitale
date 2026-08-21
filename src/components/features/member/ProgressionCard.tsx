'use client'
import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { KingdomRecognition } from '@/components/features/member/KingdomRecognition'

/* ============================================================
   ProgressionCard — « Mon Parcours du Royaume » (dashboard).

   Les 4 axes du Parcours du Royaume ne sont JAMAIS fondus en une seule échelle.
   Ce bloc affiche la reconnaissance CANONIQUE du membre sur DEUX axes distincts
   (croissance + appartenance) + sa fonction/ministère, via KingdomRecognition.
   La progression de FORMATION (learning journey) est présentée séparément sur la
   page Parcours (« Programme d'Intégration »), jamais comme un niveau de croissance.
   ============================================================ */

export function ProgressionCard() {
  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
          <Compass className="w-4 h-4" style={{ color: '#D4AF37' }} /> Mon Parcours du Royaume
        </h2>
      </div>

      {/* Reconnaissance canonique : croissance + appartenance + ministère (axes séparés). */}
      <KingdomRecognition className="mb-4" />

      <Link href="/member/dashboard/parcours"
        className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl font-inter text-sm font-semibold transition-all hover:gap-3"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #C49A20)', color: '#1A0F00' }}>
        Continuer mon parcours
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

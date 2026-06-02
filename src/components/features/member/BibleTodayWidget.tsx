'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookMarked, ChevronRight } from 'lucide-react'
import { getAnnualPlan, dayOfYearIndex, dayLabel, TOTAL_JOURS } from '@/lib/bible'

/**
 * Widget « Lecture du jour » du tableau de bord membre.
 * Affiche la lecture biblique du jour (plan annuel) + la progression locale.
 * Léger : aucune requête réseau ici, lecture du localStorage uniquement.
 */
export function BibleTodayWidget() {
  const plan = useMemo(() => getAnnualPlan(), [])
  const idx = useMemo(() => dayOfYearIndex(), [])
  const today = plan[idx]
  const [doneCount, setDoneCount] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('bible_progress')
      const arr = raw ? (JSON.parse(raw) as number[]) : []
      setDoneCount(Array.isArray(arr) ? arr.length : 0)
    } catch { setDoneCount(0) }
  }, [])

  const pct = doneCount === null ? 0 : Math.round((doneCount / TOTAL_JOURS) * 100)

  return (
    <Link href="/member/dashboard/bible" className="block rounded-2xl p-5 group"
      style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(75,0,130,0.12) 100%)', border: '1px solid rgba(212,175,55,0.2)' }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
          <BookMarked className="w-4 h-4" style={{ color: '#D4AF37' }} /> Lecture du jour
        </h2>
        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
      </div>
      <p className="font-inter text-[11px] mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Plan annuel — Jour {idx + 1}/{TOTAL_JOURS}</p>
      <p className="font-cormorant italic text-base leading-snug mb-3" style={{ color: 'rgba(255,255,255,0.85)' }}>
        {today ? dayLabel(today) : 'Bible Louis Segond'}
      </p>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#4B0082,#D4AF37)' }} />
      </div>
      <p className="font-inter text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{pct}% du plan annuel · {doneCount ?? 0} jours lus</p>
    </Link>
  )
}

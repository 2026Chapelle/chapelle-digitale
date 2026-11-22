'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Compass, CheckCircle2 } from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { KingdomRecognition } from '@/components/features/member/KingdomRecognition'

/* ============================================================
   ProgressionCard — « Mon Parcours du Royaume » (dashboard).

   Les 4 axes du Parcours du Royaume ne sont JAMAIS fondus en une seule échelle.
   Ce bloc affiche la reconnaissance CANONIQUE du membre sur DEUX axes distincts
   (croissance + appartenance) + sa fonction/ministère, via KingdomRecognition.
   La progression de FORMATION (learning journey) est présentée séparément sur la
   page Parcours (« Programme d'Intégration »), jamais comme un niveau de croissance.

   GROWTH-V2 / T1 — `next_slug` devient ACTIONNABLE.
   `getIntegrationProgress` calcule `next_slug` et son endpoint se déclare
   « source unique […] prochaine étape », mais aucun écran n'en faisait un lien :
   le moteur connaissait la prochaine étape du membre et ne la lui proposait
   jamais. La CTA générique vers /parcours est donc spécialisée quand la
   prochaine étape est connue, et remplacée par un état d'accomplissement quand
   le programme est terminé — jamais un lien mort.
   La CTA de FORMATION reste ici (dans ProgressionCard) et non dans
   KingdomRecognition, dont le contrat interdit d'y présenter la formation.
   ============================================================ */

type Progression = {
  parcours: { slug: string; titre: string }[]
  next_slug: string | null
  integration_complete: boolean
}

export function ProgressionCard() {
  const [prog, setProg] = useState<Progression | null>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    fetch('/api/member/integration-progression', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j?.ok && j.data) setProg(j.data as Progression) })
      .catch(() => { /* non bloquant : on conserve la CTA générique */ })
    return () => { cancelled = true }
  }, [])

  // Titre lisible de la prochaine étape, repris du même payload (aucun appel
  // supplémentaire). Repli sur le libellé générique si le titre est absent.
  const nextSlug = prog && !prog.integration_complete ? prog.next_slug : null
  const nextTitre = nextSlug
    ? (prog?.parcours ?? []).find((p) => p.slug === nextSlug)?.titre ?? null
    : null
  const acheve = Boolean(prog?.integration_complete)

  const styleCta: React.CSSProperties = {
    background: 'linear-gradient(135deg, #D4AF37, #C49A20)',
    color: '#1A0F00',
  }
  const classeCta =
    'inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl font-inter text-sm font-semibold transition-all hover:gap-3 min-w-0'

  return (
    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-cinzel text-sm font-bold flex items-center gap-2" style={{ color: '#FFFFFF' }}>
          <Compass className="w-4 h-4" style={{ color: '#D4AF37' }} /> Mon Parcours du Royaume
        </h2>
      </div>

      {/* Reconnaissance canonique : croissance + appartenance + ministère (axes séparés). */}
      <KingdomRecognition className="mb-4" />

      {acheve ? (
        /* Programme accompli : état d'accomplissement, et un lien vers le
           parcours plutôt qu'un bouton inerte. */
        <Link
          href="/member/dashboard/parcours"
          className="inline-flex items-center gap-2 w-full justify-center py-3 rounded-xl font-inter text-sm font-semibold transition-all min-w-0"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.35)' }}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Programme d’Intégration accompli</span>
        </Link>
      ) : nextSlug ? (
        /* Prochaine étape RÉELLE, nommée quand son titre est connu. */
        <Link href={`/member/dashboard/formations/${nextSlug}`} className={classeCta} style={styleCta}>
          <span className="truncate">
            {nextTitre ? `Reprendre : ${nextTitre}` : 'Reprendre ma prochaine étape'}
          </span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      ) : (
        /* Repli : progression inconnue (chargement, hors ligne, démo). Comportement
           d'origine conservé à l'identique. */
        <Link href="/member/dashboard/parcours" className={classeCta} style={styleCta}>
          <span className="truncate">Continuer mon parcours</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      )}
    </div>
  )
}

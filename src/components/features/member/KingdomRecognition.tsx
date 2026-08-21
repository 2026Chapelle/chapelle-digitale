'use client'
import { useEffect, useState } from 'react'
import { Sprout, Users, Crown, ArrowRight } from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/supabase'
import {
  GROWTH_LADDER_FR,
  COMMUNITY_LADDER_FR,
  RECOGNITION_PENDING_LABEL,
  nextGrowthLabel,
  nextCommunityLabel,
} from '@/lib/canonical/validation-service'

/* ============================================================
   KingdomRecognition — reconnaissance CANONIQUE du membre.

   AFFICHE STRICTEMENT LES 4 AXES SÉPARÉS (jamais fondus) :
     • CROISSANCE  → growth_level canonique (source: projection caviardée)
     • APPARTENANCE → community_status canonique
     • FONCTION / MINISTÈRE → member_ministry_roles
   La FORMATION (learning journey) est présentée AILLEURS, jamais ici.

   `pastor` / `cell_leader` / `member` / `contact` ne sont JAMAIS des marches de
   croissance : la frise CROISSANCE ne connaît que GROWTH_LADDER_FR.
   Valeur non reconnue (ou requires_review) → « En cours de reconnaissance »,
   jamais une valeur legacy.
   ============================================================ */

type AxisProjection = { key: string | null; label: string; defini: boolean }
type Projection = {
  growth: AxisProjection
  community: AxisProjection
  ministries: { key: string; label: string }[]
  // CAVIARDÉ : uniquement « en attente de reconnaissance » — jamais la valeur cible.
  readiness?: { pending: boolean }
}

function Ladder({
  title,
  icon,
  color,
  items,
  currentKey,
  defini,
  currentLabel,
  nextLabel,
  nextLabelKind,
}: {
  title: string
  icon: React.ReactNode
  color: string
  items: { key: string; label: string }[]
  currentKey: string | null
  defini: boolean
  currentLabel: string
  nextLabel: string | null
  nextLabelKind: string
}) {
  const idx = currentKey ? items.findIndex((i) => i.key === currentKey) : -1
  return (
    <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color }}>{icon}</span>
        <span className="font-inter text-[11px] uppercase tracking-widest text-pearl/45">{title}</span>
      </div>
      <div className="font-cinzel text-lg font-bold mb-3" style={{ color: defini ? color : 'rgba(255,255,255,0.4)' }}>
        {defini ? currentLabel : RECOGNITION_PENDING_LABEL}
      </div>
      {/* Frise de l'axe — chips distinctes, l'étape reconnue est mise en avant. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map((it, i) => {
          const current = i === idx
          const past = idx >= 0 && i < idx
          return (
            <span
              key={it.key}
              className="font-inter text-[10px] font-semibold px-2 py-1 rounded-full"
              style={{
                background: current ? `${color}22` : 'rgba(255,255,255,0.04)',
                color: current ? color : past ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)',
                border: current ? `1px solid ${color}` : '1px solid transparent',
              }}
            >
              {it.label}
            </span>
          )
        })}
      </div>
      {nextLabel && (
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: `${color}aa` }} />
          <span className="font-inter text-[11px] text-pearl/50">
            {nextLabelKind} : <span className="font-semibold" style={{ color }}>{nextLabel}</span>
          </span>
        </div>
      )}
    </div>
  )
}

export function KingdomRecognition({ className = '' }: { className?: string }) {
  const [proj, setProj] = useState<Projection | null>(null)
  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    fetch('/api/member/journey-projection', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j.ok) setProj(j.data) })
      .catch(() => { /* noop */ })
    return () => { cancelled = true }
  }, [])

  const growth = proj?.growth ?? { key: null, label: RECOGNITION_PENDING_LABEL, defini: false }
  const community = proj?.community ?? { key: null, label: RECOGNITION_PENDING_LABEL, defini: false }
  const ministries = proj?.ministries ?? []

  return (
    <div className={`p-5 md:p-6 rounded-3xl ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-4 h-4 text-gold" />
        <h2 className="font-cinzel text-base font-bold text-pearl">Ma reconnaissance dans la maison</h2>
        <span className="text-[10px] text-pearl/35 ml-1">reconnue par vos bergers</span>
      </div>

      {/* COMPLÉTION → READY_FOR_REVIEW (caviardé) : le membre sait qu'une étape est
          accomplie et attend la reconnaissance HUMAINE. Jamais « promu », jamais la cible. */}
      {proj?.readiness?.pending && (
        <div
          className="mb-4 flex items-start gap-2 p-3 rounded-2xl"
          style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <Sprout className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#D4AF37' }} />
          <p className="text-[12px] leading-relaxed text-pearl/80">
            Tu as accompli une étape importante de ton parcours.{' '}
            <span className="font-semibold text-gold">Tes bergers seront invités à confirmer ta reconnaissance</span>{' '}
            — cette étape passe toujours par un regard humain, jamais par un automatisme.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <Ladder
          title="Niveau de croissance"
          icon={<Sprout className="w-3.5 h-3.5" />}
          color="#D4AF37"
          items={GROWTH_LADDER_FR}
          currentKey={growth.key}
          defini={growth.defini}
          currentLabel={growth.label}
          nextLabel={growth.defini ? nextGrowthLabel(growth.key) : null}
          nextLabelKind="Prochaine étape recommandée"
        />
        <Ladder
          title="Statut communautaire"
          icon={<Users className="w-3.5 h-3.5" />}
          color="#22C55E"
          items={COMMUNITY_LADDER_FR}
          currentKey={community.key}
          defini={community.defini}
          currentLabel={community.label}
          nextLabel={community.defini ? nextCommunityLabel(community.key) : null}
          nextLabelKind="Prochaine étape communautaire"
        />
      </div>

      {/* AXE 4 — Fonction / ministère : distinct, jamais un niveau de croissance. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-inter text-[11px] uppercase tracking-widest text-pearl/45">Fonction / ministère :</span>
        {ministries.length > 0 ? (
          ministries.map((m) => (
            <span key={m.key} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(139,92,246,0.14)', color: '#A78BFA' }}>
              {m.label}
            </span>
          ))
        ) : (
          <span className="text-[11px] text-pearl/40">Aucune fonction attribuée</span>
        )}
      </div>
    </div>
  )
}

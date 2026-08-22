'use client'
/**
 * CITADELLE INTELLIGENCE HUB — HUB-4
 * Panneau « Comprendre ces données ». Dictionnaire canonique complet des métriques,
 * groupé logiquement, + explications transverses (0 vs indisponible, différé Google).
 *
 * Accessibilité : role="dialog" aria-modal, titre lié, fermeture au clic sur le
 * fond / bouton / touche Échap, focus initial sur le bouton fermer.
 */

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { FRESHNESS_LABELS_FR } from '@/lib/intelligence/types/freshness'
import { metricsByGroup, type MetricDictionaryEntry } from '@/lib/intelligence/guide/dictionary'

function MetricRow({ m }: { m: MetricDictionaryEntry }) {
  return (
    <div className="border-t border-pearl/10 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-pearl/90">{m.name}</div>
        <span className="rounded-full border border-pearl/15 px-2 py-0.5 text-[10px] text-pearl/45">
          {FRESHNESS_LABELS_FR[m.freshness]}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-pearl/70">{m.definition}</p>
      <div className="mt-1 text-[11px] text-pearl/40">Source : {m.source}</div>
      <dl className="mt-2 space-y-1 text-[11px]">
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-pearl/45">Comment lire</dt>
          <dd className="text-pearl/70">{m.howToRead}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-pearl/45">Bon signe</dt>
          <dd className="text-pearl/70">{m.whatGoodMeans}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-pearl/45">Mauvais signe</dt>
          <dd className="text-pearl/70">{m.whatBadMeans}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-pearl/45">Quoi faire</dt>
          <dd className="text-cinematic-gold/90">{m.whatToDo}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-24 shrink-0 font-semibold text-pearl/45">Limites</dt>
          <dd className="text-pearl/55">{m.limitations}</dd>
        </div>
      </dl>
    </div>
  )
}

export default function GuideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const groups = metricsByGroup()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Focus initial sur le bouton fermer (accessibilité).
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="flex h-full w-full max-w-lg flex-col bg-abyss shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-pearl/10 px-5 py-4">
          <h2 id="guide-title" className="font-cinzel text-lg font-black text-pearl">
            Comprendre ces données
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer le guide"
            className="rounded-lg p-1.5 text-pearl/60 transition hover:bg-pearl/10 hover:text-pearl focus:outline-none focus-visible:ring-1 focus-visible:ring-cinematic-gold"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm">
          {/* Explications transverses */}
          <section className="mb-6 space-y-3">
            <div className="card-royal border-l-2 p-3" style={{ borderLeftColor: '#4ade80' }}>
              <div className="text-[12px] font-semibold text-pearl/85">Pourquoi ce chiffre est à 0 ?</div>
              <p className="mt-1 text-[11px] leading-relaxed text-pearl/65">
                Un 0 est une valeur RÉELLE : il n’y a réellement eu aucun événement aujourd’hui sur cette
                mesure. C’est différent d’« Indisponible ». Un 0 disparaît dès qu’un premier événement survient.
              </p>
            </div>
            <div className="card-royal border-l-2 p-3" style={{ borderLeftColor: '#9ca3af' }}>
              <div className="text-[12px] font-semibold text-pearl/85">Pourquoi cette donnée est indisponible ?</div>
              <p className="mt-1 text-[11px] leading-relaxed text-pearl/65">
                « Indisponible » signifie qu’aucune source FIABLE ne prouve la mesure (événement non
                instrumenté, ou connecteur non configuré). On ne montre jamais un 0 trompeur ni une estimation :
                l’absence de preuve n’est pas un zéro.
              </p>
            </div>
            <div className="card-royal border-l-2 p-3" style={{ borderLeftColor: '#fbbf24' }}>
              <div className="text-[12px] font-semibold text-pearl/85">Pourquoi Google est différé ?</div>
              <p className="mt-1 text-[11px] leading-relaxed text-pearl/65">
                Search Console et GA4 ne livrent leurs chiffres qu’avec 2 à 3 jours de retard. Ces données sont
                donc marquées « Différé (SEO) » — elles ne peuvent jamais être présentées comme du temps réel.
              </p>
            </div>
            <div className="card-royal border-l-2 p-3" style={{ borderLeftColor: '#f87171' }}>
              <div className="text-[12px] font-semibold text-pearl/85">Pourquoi certains taux sont indisponibles ?</div>
              <p className="mt-1 text-[11px] leading-relaxed text-pearl/65">
                Un taux n’est calculé que si les deux étapes comparent la MÊME population. Diviser des « pages
                vues » par des « personnes », ou des « écoutes » par des « inscriptions », donnerait un chiffre
                faux (parfois &gt; 100 %). Dans ce cas, le taux est marqué « Indisponible » avec sa raison.
              </p>
            </div>
          </section>

          {/* Dictionnaire complet, groupé */}
          {groups.map((g) => (
            <section key={g.group} className="mb-6">
              <div className="section-label mb-1">{g.group}</div>
              {g.entries.map((m) => (
                <MetricRow key={m.key} m={m} />
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

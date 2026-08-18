'use client'
/**
 * PODCAST-SPINE — Explorateur de Saisons (île cliente de la page Série).
 * Onglets thématiques accessibles (?saison=N crawlable/partageable) + panneau de la
 * saison active : cover (fallback résolu serveur), thème, « Commencer la série »,
 * grille d'épisodes, éditions spéciales, notes éditoriales optionnelles (auto-masquées).
 *
 * ACCÈS : l'accès reste porté par l'ÉPISODE (aucun gate au niveau Saison). La lecture
 * passe par usePodcastPlayback → /api/podcast/:id/play (gate serveur réel). La Saison 2
 * (membres) reste VISIBLE au visiteur (titres/durées/covers) et sert d'incitation à
 * rejoindre la Citadelle.
 */
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Play, ArrowRight, Sparkles, Quote } from 'lucide-react'
import { EpisodeCoverCard, type RailEpisode } from './EpisodeRail'
import { SeasonTabs, type SeasonTab } from './SeasonTabs'
import { SpecialEditionCard } from './SpecialEditionCard'
import { JoinToListenModal } from './JoinToListenModal'
import { usePodcastPlayback, type PlayableEpisode } from './usePodcastPlayback'
import { useAuth } from '@/components/providers/AuthProvider'
import { isMemberStatus } from '@/lib/podcast/playback-access'
import { pickFirstPlayable, resolveActiveSeasonNumber, type SpineEpisode } from '@/lib/podcast/spine-helpers'

export interface SeasonView {
  id: string
  number: number
  title: string          // titre thématique (déjà résolu « Saison N » en fallback)
  shortDescription?: string | null
  description?: string | null
  cover?: string | null  // fallback saison→série→émission résolu serveur
}

const toPlayable = (e: SpineEpisode): PlayableEpisode => ({
  id: e.id, title: e.title, serie: e.serie, duration: e.duration, cover: e.cover, accessLevel: e.accessLevel,
})
const toRail = (e: SpineEpisode): RailEpisode => ({
  id: e.id, title: e.title, description: e.description, cover: e.cover, serie: e.serie,
  duration: e.duration, accessLevel: e.accessLevel,
})

export function SeasonExplorer({
  seasons, episodesBySeason, initialSaison,
}: {
  seasons: SeasonView[]
  episodesBySeason: Record<number, SpineEpisode[]>
  initialSaison: number
}) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const isMember = isMemberStatus(profile?.membre_statut)
  const { requestPlay, isPlaying, joinFor, setJoinFor, notice, setNotice, user } = usePodcastPlayback('series')

  const available = seasons.map((s) => s.number)
  // Deep-link initial (?saison=N) résolu serveur → initialSaison. La saison active
  // suit ensuite l'historique navigateur : chaque changement pousse une entrée
  // (history.pushState) et le retour/avance la resynchronise (popstate).
  const [active, setActive] = useState<number>(() => resolveActiveSeasonNumber(initialSaison, available, initialSaison))
  useEffect(() => {
    const onPop = () => {
      const raw = new URLSearchParams(window.location.search).get('saison')
      setActive(resolveActiveSeasonNumber(raw, available, initialSaison))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // available/initialSaison sont stables pour la durée de vie du composant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const select = (n: number) => {
    if (n === active || !available.includes(n)) return
    setActive(n)
    // Entrée d'historique navigable (URL partageable) sans re-fetch serveur ni scroll.
    window.history.pushState(null, '', `${pathname}?saison=${n}`)
  }

  const activeSeason = seasons.find((s) => s.number === active) ?? seasons[0]
  const eps = episodesBySeason[active] ?? []
  const specials = eps.filter((e) => e.episodeType === 'special')
  const standards = eps.filter((e) => e.episodeType !== 'special')
  const notes = eps.filter((e) => e.aRetenir || e.prayerText || e.declarationText)

  // « Commencer la saison » : premier épisode réellement jouable (sinon le 1er, gate serveur décidera).
  const firstPlayable = useMemo(
    () => pickFirstPlayable(eps, { isMember, hasPremium: false }) ?? eps[0] ?? null,
    [eps, isMember],
  )
  // Incitation membre : la saison contient des épisodes membres non écoutables par un visiteur.
  const visitorHasLockedMember = !user && eps.some((e) => e.accessLevel === 'member' || e.accessLevel === 'premium')

  const tabs: SeasonTab[] = seasons.map((s) => ({ number: s.number, title: s.title }))

  return (
    <section aria-label="Saisons" className="px-4 md:px-0">
      {seasons.length > 1 && (
        <div className="mb-6">
          <SeasonTabs seasons={tabs} activeNumber={active} onSelect={select} />
        </div>
      )}

      {activeSeason && (
        <div id={`season-panel-${active}`} role="tabpanel" aria-labelledby={`season-tab-${active}`}>
          {/* En-tête de saison : cover + thème + descriptions */}
          <div className="grid md:grid-cols-[200px_1fr] gap-5 md:gap-7 items-start mb-7">
            <div className="relative w-full max-w-[200px] mx-auto md:mx-0 overflow-hidden rounded-2xl aspect-[1/1] bg-[#0a0a12]">
              {activeSeason.cover ? (
                <Image src={activeSeason.cover} alt={activeSeason.title} fill sizes="200px" className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(212,175,55,0.14), transparent 62%), linear-gradient(135deg,#2a1a4a,#0a0a12)' }}>
                  <Sparkles className="w-10 h-10 text-gold/40" aria-hidden />
                </div>
              )}
            </div>
            <div>
              <p className="section-label-dark mb-2">Saison {activeSeason.number}</p>
              <h2 className="font-cinzel text-2xl md:text-3xl font-bold text-pearl leading-tight">{activeSeason.title}</h2>
              {activeSeason.shortDescription && (
                <p className="mt-2 font-inter text-sm md:text-base leading-relaxed" style={{ color: 'rgba(245,230,216,0.6)' }}>
                  {activeSeason.shortDescription}
                </p>
              )}
              {activeSeason.description && activeSeason.description !== activeSeason.shortDescription && (
                <p className="mt-2 font-inter text-sm leading-relaxed" style={{ color: 'rgba(245,230,216,0.5)' }}>
                  {activeSeason.description}
                </p>
              )}
              {firstPlayable && (
                <button
                  type="button"
                  onClick={() => requestPlay(toPlayable(firstPlayable))}
                  className="btn-gold-cinematic mt-4 inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]"
                  style={{ padding: '11px 22px', fontSize: '0.9rem' }}
                >
                  <Play className="w-4 h-4" fill="currentColor" /> Commencer la saison
                </button>
              )}
            </div>
          </div>

          {/* Éditions spéciales (uniquement si réelles) */}
          {specials.map((sp) => (
            <SpecialEditionCard key={sp.id} ep={sp} playing={isPlaying(sp.id)} onPlay={() => requestPlay(toPlayable(sp))} />
          ))}

          {/* Grille d'épisodes (ordre éditorial stable) */}
          {standards.length > 0 ? (
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
              {standards.map((e) => (
                <EpisodeCoverCard key={e.id} ep={toRail(e)} playing={isPlaying(e.id)} onPlay={() => requestPlay(toPlayable(e))} />
              ))}
            </div>
          ) : specials.length === 0 ? (
            <p className="font-inter text-sm py-8 text-center" style={{ color: 'rgba(245,230,216,0.4)' }}>
              Les épisodes de cette saison arrivent bientôt.
            </p>
          ) : null}

          {/* Incitation membre (visiteur) — la Saison reste visible, l'écoute invite à rejoindre. */}
          {visitorHasLockedMember && (
            <div className="mt-7 rounded-2xl p-5 text-center" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.22)' }}>
              <p className="font-cinzel text-base font-bold text-pearl">Rejoins La Citadelle pour poursuivre cette saison.</p>
              <p className="font-inter text-sm mt-1 mb-4" style={{ color: 'rgba(245,230,216,0.55)' }}>
                Les épisodes réservés aux membres t'attendent une fois connecté.
              </p>
              <Link href="/rejoindre" className="btn-gold-cinematic inline-flex items-center gap-2" style={{ padding: '10px 22px', fontSize: '0.88rem' }}>
                Rejoindre La Citadelle <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          )}

          {/* Notes éditoriales optionnelles — auto-masquées si aucun champ renseigné. */}
          {notes.length > 0 && (
            <div className="mt-8">
              <p className="section-label-dark mb-3">Pour aller plus loin</p>
              <div className="space-y-2.5">
                {notes.map((e) => (
                  <details key={e.id} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <summary className="cursor-pointer px-4 py-3 font-inter text-sm font-semibold text-pearl/85 select-none">{e.title}</summary>
                    <div className="px-4 pb-4 space-y-3">
                      {e.aRetenir && (
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-gold/70 font-inter mb-1">À retenir</p>
                          <p className="font-inter text-sm" style={{ color: 'rgba(245,230,216,0.7)' }}>{e.aRetenir}</p>
                        </div>
                      )}
                      {e.prayerText && (
                        <div className="pl-3 border-l-2 border-gold/40">
                          <p className="text-[10px] uppercase tracking-widest text-gold/70 font-inter mb-1 inline-flex items-center gap-1"><Quote className="w-3 h-3" aria-hidden /> Prière de l'épisode</p>
                          <p className="font-cormorant italic text-base" style={{ color: 'rgba(245,230,216,0.75)' }}>{e.prayerText}</p>
                        </div>
                      )}
                      {e.declarationText && (
                        <div className="pl-3 border-l-2 border-gold/40">
                          <p className="text-[10px] uppercase tracking-widest text-gold/70 font-inter mb-1">Déclaration du jour</p>
                          <p className="font-cormorant italic text-base" style={{ color: 'rgba(245,230,216,0.75)' }}>{e.declarationText}</p>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verrou visiteur (JoinToListenModal) + refus serveur (notice) — jamais d'URL média. */}
      <JoinToListenModal open={!!joinFor} onClose={() => setJoinFor(null)} episodeTitle={joinFor?.title} />
      {notice && (
        <div role="dialog" aria-modal="true" aria-label={notice.title} className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setNotice(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
          <div className="relative z-[1] w-full max-w-sm rounded-2xl border border-[rgba(212,175,55,0.35)] bg-[#0c0c14] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cinzel font-bold text-cinematic-gold text-xl mb-2">{notice.title}</h3>
            <p className="font-inter text-sm mb-5" style={{ color: 'rgba(245,230,216,0.7)' }}>{notice.message}</p>
            <div className="flex flex-col gap-2">
              <Link href="/rejoindre" onClick={() => setNotice(null)} className="btn-gold-cinematic inline-flex items-center justify-center" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
                Rejoindre La Citadelle
              </Link>
              <button type="button" onClick={() => setNotice(null)} className="text-xs font-inter" style={{ color: 'rgba(245,230,216,0.5)' }}>Plus tard</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

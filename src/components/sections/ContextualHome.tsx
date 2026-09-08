'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Heart, Radio } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { INTENTS, resolveFirstStep, resolveHeroGreeting, selectTodayPrimary, type HomeIntent, type LiveState, type TodayPrimaryCandidate } from '@/lib/home/contextual'
import { resolveMemberNextAction, type MemberNextAction } from '@/lib/member-home/next-action'
import { track } from '@/lib/analytics'
import { supabase } from '@/lib/supabase'
import { fetchPublishedPodcasts } from '@/lib/podcast/fetch-episodes'

const dateLabel = (value?: string) => value ? new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Préparé pour le prochain direct'
type FormationRow = { slug?: string; titre?: string; contenu_court?: string; description?: string; image_couverture?: string }

export function ContextualHome({ liveState }: { liveState: LiveState }) {
  const { user, profile, isDemo } = useAuth()
  const authenticated = Boolean(user) && !isDemo
  const hero = resolveHeroGreeting({ authenticated, firstName: authenticated ? (profile?.prenom || profile?.first_name || '') : '' })
  const [intent, setIntent] = useState<HomeIntent | null>(null)
  const [memberNextAction, setMemberNextAction] = useState<MemberNextAction | null>(null)
  const [podcast, setPodcast] = useState<{ title: string; cover?: string } | null>(null)
  const [formations, setFormations] = useState<FormationRow[]>([])
  const revealRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!authenticated) return
    let cancelled = false
    Promise.all([
      fetch('/api/member/formations', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null),
      fetch('/api/member/integration-progression', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : null),
    ]).then(([f, i]) => {
      if (!cancelled) setMemberNextAction(resolveMemberNextAction({ integration: i?.ok ? i.data : null, formations: f?.ok ? f.data?.inscriptions || [] : [] }))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [authenticated])

  useEffect(() => {
    let cancelled = false
    Promise.resolve(fetchPublishedPodcasts(cols => supabase.from('cms_podcasts').select(cols).eq('status', 'published').order('published_at', { ascending: false }).limit(1)))
      .then(({ rows }) => {
        const row = rows[0]
        if (!cancelled && typeof row?.title === 'string' && row.title.trim()) setPodcast({ title: row.title.trim(), cover: typeof row.cover_url === 'string' && row.cover_url.trim() ? row.cover_url : undefined })
      }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.resolve(supabase.from('formations').select('slug,titre,contenu_court,description,image_couverture').eq('statut', 'publie').in('slug', ['visiteur', 'nouveau-croyant', 'salut', 'je-decouvre-la-maison']))
      .then(({ data }) => { if (!cancelled && data) setFormations(data as FormationRow[]) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => { revealRef.current?.querySelectorAll('section').forEach(el => el.classList.add('home-reveal')) }, [])

  useEffect(() => {
    const root = revealRef.current
    if (!root || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cards = root.querySelectorAll<HTMLElement>('.home-motion-card')
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('home-motion-enter')
          observer.unobserve(entry.target)
        })
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -6% 0px',
      },
    )

    cards.forEach((card, index) => {
      card.style.setProperty('--home-motion-delay', `${(index % 4) * 55}ms`)
      observer.observe(card)
    })

    return () => observer.disconnect()
  }, [])

  const candidates = useMemo<TodayPrimaryCandidate[]>(() => formations.map(row => ({
    kind: row.slug === 'visiteur' ? 'visitor' : row.slug === 'nouveau-croyant' || row.slug === 'salut' ? 'salvation' : 'integration',
    title: row.titre || 'Je découvre la maison',
    description: row.contenu_court || row.description,
    image: row.image_couverture || (row.slug === 'je-decouvre-la-maison' ? '/images/formations/parcours-1/parcours-1-je-decouvre-la-maison.png' : undefined),
    href: row.slug ? '/formations/' + row.slug : '/formations',
  })), [formations])
  const primary = selectTodayPrimary(candidates) || { kind: 'integration' as const, title: 'Je découvre la maison', description: 'Parcours, enseignements et prière réunis au même endroit.', image: '/images/formations/parcours-1/parcours-1-je-decouvre-la-maison.png', href: authenticated ? (memberNextAction?.href || '/member/dashboard') : '/rejoindre' }
  const firstStep = useMemo(() => resolveFirstStep({ intent: intent || 'grow_in_faith', authenticated, memberNextAction, liveState }), [intent, authenticated, memberNextAction, liveState])

  const hasLive = liveState.status !== 'OFFLINE'

  return <div ref={revealRef} className="bg-charbon text-pearl overflow-hidden">
    <section className="relative min-h-[min(720px,90svh)] flex items-center overflow-hidden">
      <Image src="/images/prayers/prayer-consecration.jpg" alt="Un moment de prière" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 container-cinematic max-w-5xl pt-28 pb-20">
        <p className="font-inter text-[11px] uppercase tracking-[.28em] text-[#F5E6A7]/75 mb-5">Citadelle · La maison qui t’accompagne</p>
        <h1 className="font-cinzel font-black text-4xl sm:text-5xl md:text-7xl leading-[1.05] max-w-3xl text-white">{hero.title}</h1>
        <p className="font-cormorant text-2xl md:text-3xl text-[#F5E6A7] mt-5 max-w-2xl">{hero.subtitle}</p>
        <p className="font-inter text-sm md:text-base leading-relaxed text-white/65 max-w-xl mt-5">Enseignements, parcours, prières, directs et accompagnement réunis dans un même espace.</p>
        {liveState.status !== 'OFFLINE' && <div className="mt-8 max-w-xl rounded-2xl border border-[#D4AF37]/25 bg-black/35 p-4"><div className="flex items-start gap-3"><Radio className="w-5 h-5 mt-0.5 text-[#D4AF37]" /><div><p className="font-inter text-[10px] uppercase tracking-[.22em] font-bold text-[#D4AF37]">{liveState.status === 'LIVE' ? 'En direct maintenant' : 'Prochain direct'}</p><p className="font-cinzel text-white font-bold mt-1">{liveState.title}</p>{liveState.status === 'UPCOMING' && liveState.scheduledAt && <p className="font-inter text-xs text-white/55 mt-1">{dateLabel(liveState.scheduledAt)}</p>}</div></div></div>}
        <div className="flex flex-col sm:flex-row gap-3 mt-8"><Link href={authenticated ? (memberNextAction?.href || '/member/dashboard') : '/rejoindre'} className="btn-gold-cinematic inline-flex items-center justify-center gap-2 min-h-[50px] px-6">{authenticated ? 'ENTRER DANS MA CITADELLE' : 'COMMENCER MAINTENANT'}<ArrowRight className="home-motion-arrow w-4 h-4" /></Link>{!authenticated && <Link href="#intentions" className="inline-flex items-center justify-center min-h-[50px] px-5 rounded-full border border-white/20 text-white/65 text-sm">Découvrir Citadelle</Link>}</div>
      </div>
    </section>
    <section id="intentions" className="container-cinematic max-w-5xl py-16 md:py-20"><p className="font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75 mb-3">Un point de départ simple</p><h2 className="font-cinzel text-3xl md:text-4xl text-white">De quoi as-tu besoin aujourd’hui ?</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">{INTENTS.map(item => <button key={item.id} type="button" onClick={() => { setIntent(item.id); track('home_intent_selected', { intent: item.id }) }} className="home-motion-card text-left p-5 rounded-2xl border border-white/10 bg-white/[.03]"><span className="font-cinzel text-white font-bold">{item.title}</span><span className="block font-inter text-xs text-white/45 mt-2">{item.description}</span></button>)}</div><div className="home-motion-card mt-8 rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/[.06] p-5 md:p-7"><p className="font-inter text-[10px] uppercase tracking-[.24em] text-[#D4AF37]">{intent ? 'Ton premier pas' : 'Ton premier pas peut commencer ici'}</p><h3 className="font-cinzel text-xl md:text-2xl text-white mt-2">{firstStep.title}</h3><p className="font-inter text-sm text-white/60 mt-2 max-w-xl">{firstStep.reason}</p><Link href={firstStep.href} className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-[#F5E6A7]">{firstStep.cta}<ArrowRight className="home-motion-arrow w-4 h-4" /></Link></div></section>
    <section className="border-y border-white/[.06] bg-[#0b0c14]"><div className="container-cinematic max-w-5xl py-16 md:py-20"><p className="font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75 mb-3">Ce qui peut t’aider maintenant</p><h2 className="font-cinzel text-3xl text-white mb-7">Aujourd’hui sur Citadelle</h2><div className="today-layout-grid grid md:grid-cols-3 gap-4 items-start">
      <article className="today-primary-card home-motion-card self-start md:col-span-2 md:col-start-1 md:row-start-1 rounded-2xl border border-[#D4AF37]/25 overflow-hidden bg-gradient-to-br from-[#1b1630] to-[#0b0c14]"><div className="today-primary-image"><Image src={primary.image || '/images/formations/parcours-1/parcours-1-je-decouvre-la-maison.png'} alt={primary.title} width={1200} height={675} className="home-motion-image w-full h-auto object-contain" /></div><div className="today-primary-content p-6"><p className="today-card-label">GRANDIR</p><h3 className="font-cinzel text-xl text-white mt-2">{primary.title}</h3><p className="font-inter text-sm text-white/55 mt-2">{primary.description || 'Un chemin simple pour avancer.'}</p><Link href={primary.href} className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-[#F5E6A7]">Ouvrir <ArrowRight className="home-motion-arrow w-4 h-4" /></Link></div></article>
      {podcast && <article className="today-podcast-card today-support-card home-motion-card self-start md:col-start-3 md:row-start-1 rounded-2xl border border-[#D4AF37]/20 overflow-hidden bg-[#171126]"><Image src={podcast.cover || '/images/podcast/covers/instant-citadelle-cover.png'} alt={podcast.title} width={640} height={360} className="home-motion-image w-full aspect-video object-cover" /><div className="p-5"><p className="today-card-label">PODCAST</p><h3 className="font-cinzel text-lg text-white mt-2">{podcast.title}</h3><p className="font-inter text-sm text-white/55 mt-2">Un enseignement à écouter aujourd’hui.</p><Link href="/podcast" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-[#F5E6A7]">Écouter maintenant <ArrowRight className="home-motion-arrow w-4 h-4" /></Link></div></article>}
      {hasLive && <article className="today-live-card today-support-card home-motion-card home-motion-live self-start md:col-span-2 md:col-start-1 md:row-start-2 rounded-2xl border border-white/10 overflow-hidden bg-white/[.03] md:grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"><Image src={liveState.thumbnail || '/images/prayers/prayer-family.jpg'} alt={liveState.title} width={640} height={360} className="home-motion-image w-full aspect-video md:aspect-auto md:h-full object-cover" /><div className="p-5 md:p-6"><p className="today-card-label">{liveState.status === 'LIVE' ? 'EN DIRECT' : 'PROCHAIN RENDEZ-VOUS'}</p><h3 className="font-cinzel text-lg text-white mt-2">{liveState.title}</h3>{liveState.status === 'UPCOMING' && liveState.scheduledAt && <p className="font-inter text-sm text-white/55 mt-2">{dateLabel(liveState.scheduledAt)}</p>}<Link href="/live" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-[#F5E6A7]">{liveState.status === 'LIVE' ? 'Rejoindre maintenant' : 'Voir le rendez-vous'} <ArrowRight className="home-motion-arrow w-4 h-4" /></Link></div></article>}
      <article className={`today-prayer-card today-support-card home-motion-card self-start rounded-2xl border border-white/10 overflow-hidden bg-white/[.03] ${hasLive ? 'today-prayer-live-row md:col-start-3 md:row-start-2' : 'today-prayer-offline-row md:col-span-3 md:col-start-1 md:row-start-2'}`}><div className={hasLive ? 'p-6' : 'today-prayer-offline-content p-6 md:flex md:items-center md:justify-between md:gap-8'}><div><Heart className="w-5 h-5 text-[#D4AF37]" /><p className="today-card-label mt-5">ÊTRE ACCOMPAGNÉ</p><h3 className="font-cinzel text-lg text-white mt-2">Un espace pour souffler</h3><p className="font-inter text-sm text-white/50 mt-2">Prière, écoute et présence quand tu en as besoin.</p></div><Link href="/priere" className={`inline-flex items-center gap-2 text-sm font-semibold text-[#F5E6A7] ${hasLive ? 'mt-5' : 'mt-5 md:mt-0 md:flex-none'}`}>Déposer une demande <ArrowRight className="home-motion-arrow w-4 h-4" /></Link></div></article>
    </div></div></section>
    <section className="container-cinematic max-w-5xl py-16 md:py-20"><div className="home-motion-card rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#171126] to-[#0a0a10] p-7 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-7"><div className="max-w-xl"><p className="font-inter text-[10px] uppercase tracking-[.25em] text-[#D4AF37]/75 mb-3">Une présence humaine</p><h2 className="font-cinzel text-3xl text-white">Tu n’as pas besoin de tout porter seul.</h2><p className="font-inter text-sm text-white/60 mt-3">Besoin de prière, d’écoute ou simplement de parler à quelqu’un ?</p></div><div className="pastoral-actions flex flex-col gap-3 items-stretch md:items-center md:flex-none"><Link href="/priere" className="btn-gold-cinematic inline-flex items-center justify-center flex-none w-full md:w-[240px] min-h-[48px] px-6">Demander une prière</Link><Link href="/contact" className="inline-flex items-center justify-center flex-none w-full md:w-[240px] min-h-[48px] px-6 rounded-full border border-white/20 text-white/75 text-sm">Parler à quelqu’un</Link></div></div></section>
    <section className="home-final-cta relative border-t border-white/[.06]"><div className="container-cinematic max-w-4xl py-16 md:py-24 text-center"><h2 className="font-cinzel text-3xl md:text-4xl text-[#F5E6A7]">Ton prochain pas peut commencer aujourd’hui.</h2><p className="font-inter text-sm text-white/55 mt-4">Entre dans Citadelle et avance simplement, un pas après l’autre.</p><div className="home-final-cta-action flex justify-center mt-7"><Link href={authenticated ? (memberNextAction?.href || '/member/dashboard') : '/rejoindre'} className="btn-gold-cinematic inline-flex items-center justify-center gap-2 min-h-[50px] px-7">{authenticated ? 'ENTRER DANS MA CITADELLE' : 'COMMENCER MAINTENANT'}<ArrowRight className="home-motion-arrow w-4 h-4" /></Link></div></div></section>
  </div>
}

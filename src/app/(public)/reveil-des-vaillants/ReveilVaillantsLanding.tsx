'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BookOpen, HeartHandshake, Users, Shield, Sparkles, Compass } from 'lucide-react'
import { IS_DEMO_MODE } from '@/lib/supabase'
import { getBrowserClient } from '@/lib/supabase-browser'

const pillars = [
  { title: 'Se lever', text: 'Quitter l’immobilisme et répondre à l’appel de Dieu.' },
  { title: 'S’équiper', text: 'Grandir dans la Parole, la prière et le discernement.' },
  { title: 'S’engager', text: 'Mettre ses dons au service des autres et de la mission.' },
  { title: 'Conquérir', text: 'Avancer avec foi, sagesse et persévérance.' },
]
const territories = [
  { title: 'Vie spirituelle', text: 'Fortifier sa foi et sa communion avec Dieu.', icon: Sparkles },
  { title: 'Famille', text: 'Bâtir des relations solides, aimantes et responsables.', icon: HeartHandshake },
  { title: 'Destinée', text: 'Identifier ses dons et avancer dans sa vocation.', icon: Compass },
  { title: 'Projets', text: 'Passer des intentions aux actions concrètes.', icon: Shield },
  { title: 'Mission', text: 'Servir, témoigner et édifier la communauté.', icon: Users },
]
const journeys = [
  { title: 'Je veux grandir', text: 'Découvrir les enseignements et parcours de formation.', href: '/formations', label: 'Explorer les formations', icon: BookOpen },
  { title: 'Je veux appartenir', text: 'Découvrir la communauté et commencer un parcours d’intégration.', href: '/integration', label: 'Rejoindre la communauté', icon: Users },
  { title: 'Je veux servir', text: 'Découvrir les possibilités de service dans la vision.', href: '/servir', label: 'Découvrir les équipes', icon: HeartHandshake },
]

const faqs = [
  { question: 'À qui s’adresse Le Réveil des Vaillants ?', answer: 'À toute personne qui souhaite grandir dans la foi, découvrir la vision de la Chapelle Royale ou s’engager dans une démarche de service.' },
  { question: 'Comment participer au culte du dimanche ?', answer: 'Consultez la rubrique Cultes de Citadelle pour découvrir les rendez-vous et les modalités de participation disponibles.' },
  { question: 'Dois-je être membre pour découvrir les formations ?', answer: 'Vous pouvez explorer les formations présentées sur Citadelle. Les conditions d’accès dépendent de chaque parcours.' },
  { question: 'Comment rejoindre la communauté ?', answer: 'Le parcours d’intégration vous permet de découvrir la communauté et les prochaines étapes pour la rejoindre.' },
  { question: 'Comment proposer mon aide ?', answer: 'Rendez-vous dans la rubrique Servir pour découvrir les possibilités d’engagement et les démarches proposées.' },
]

const fallbackCulte = {
  title: 'Sors de ta cachette, vaillant héros !',
  description: 'Juges 6:12-16 · Avec le Pasteur Zorobabel. Culte de Célébration Royale.',
  starts_at: '2026-11-01T10:30:00Z',
  cover_url: '/images/reveil-vaillants/culte-2026-11-01.png',
  slug: null,
  cta_href: null,
}

export function ReveilVaillantsLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [isFallbackCulteVisible, setIsFallbackCulteVisible] = useState(true)
  const [campaignCulte, setCampaignCulte] = useState<{
    title: string; description: string | null; starts_at: string | null;
    cover_url: string | null; slug: string | null; cta_href: string | null;
  } | null>(null)

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let active = true
    const load = async () => {
      const client = getBrowserClient()
      if (!client) return
      const { data, error } = await client.from('cms_events')
        .select('title, description, starts_at, cover_url, slug, cta_href')
        .eq('status', 'published')
        .like('slug', 'reveil-vaillants-2026-11-%')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
      if (active && !error) setCampaignCulte(data?.[0] ?? null)
    }
    void load()
    return () => { active = false }
  }, [])
  useEffect(() => {
    setIsFallbackCulteVisible(Date.now() < Date.parse('2026-11-02T00:00:00Z'))
  }, [])
  const reduce = useReducedMotion()
  const enter = (delay = 0) => ({
    initial: false,
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: reduce ? 0 : 0.85, delay, ease: 'easeOut' as const },
  })

  // Temporary local campaign fallback, expires after November 1 (Abidjan/UTC).
  // Published CMS event always takes priority.
  const displayCulte = campaignCulte ?? (isFallbackCulteVisible ? fallbackCulte : null)
  return (
    <div className="bg-abyss text-[#F7F4EE] font-inter">
      <section aria-labelledby="vaillants-title" className="relative isolate flex min-h-[min(900px,100svh)] items-center overflow-hidden py-28 sm:py-36">
        <Image src="/images/reveil-vaillants/hero.webp" alt="" fill priority sizes="100vw" quality={82} className="object-cover object-[64%_center] md:object-center" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-abyss/95 via-abyss/75 to-abyss/20 md:via-abyss/65" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-abyss/25" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <motion.p {...enter()} className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-light sm:text-sm">Novembre 2026 <span aria-hidden="true">âœ¦</span> Josué 1:11</motion.p>
            <motion.h1 {...enter(0.08)} id="vaillants-title" className="font-cinzel text-[clamp(2.2rem,6vw,5.5rem)] font-black leading-[1.07] tracking-tight text-white drop-shadow-xl">LE RÉVEIL <span className="block text-gold-light">DES VAILLANTS</span></motion.h1>
            <motion.p {...enter(0.16)} className="mt-6 max-w-2xl font-cormorant text-2xl italic leading-snug text-[#F5E6A7] sm:text-4xl">Le temps de prendre possession est arrivé !</motion.p>
            <motion.p {...enter(0.22)} className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 sm:text-sm">Se lever · S’équiper · S’engager · Conquérir</motion.p>
            <motion.div {...enter(0.3)} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#prendre-ma-place" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-gradient-gold px-6 py-3 font-semibold text-abyss shadow-gold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Prendre ma place <ArrowRight size={18} aria-hidden="true" /></a>
              <a href="#vision" className="inline-flex min-h-12 items-center justify-center rounded-md border border-gold/70 bg-abyss/60 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-colors hover:bg-royal/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">Découvrir la vision</a>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="vision" className="relative scroll-mt-28 overflow-hidden px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="vision-title">
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-56 w-96 -translate-x-1/2 rounded-full bg-royal/20 blur-3xl" />
        <motion.div {...enter()} className="relative mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">Un appel à se lever</p>
          <h2 id="vision-title" className="mt-4 font-cinzel text-3xl font-bold text-white sm:text-4xl">Le courage de répondre à l’appel</h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">Le Réveil des Vaillants est une invitation à sortir de l’immobilisme, à grandir dans la foi et à prendre sa place dans une communauté qui prie, apprend, sert et partage l’Évangile.</p>
        </motion.div>
        <div className="relative mx-auto mt-9 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <motion.article key={p.title} {...enter(i * 0.1)} whileHover={reduce ? undefined : { y: -7 }} className="group relative overflow-hidden rounded-lg border border-gold/15 bg-white/[0.035] px-5 py-5 transition-colors duration-300 hover:border-gold/60 hover:bg-royal/15">
              <span className="font-cinzel text-xl text-gold/70">0{i + 1}</span>
              <h3 className="mt-2 font-cinzel text-base font-semibold text-gold-light">{p.title}</h3>
              <p className="mt-2 text-xs leading-6 text-white/70">{p.text}</p>
              <div aria-hidden="true" className="absolute bottom-0 left-0 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-royal px-5 py-16 sm:px-8 sm:py-20" aria-labelledby="david-title">
        <motion.div {...enter()} className="mx-auto max-w-5xl border-l-2 border-gold pl-6 sm:pl-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light">1 Samuel 22:1-2 · 1 Chroniques 12</p>
          <h2 id="david-title" className="mt-3 font-cinzel text-3xl font-bold sm:text-4xl">De la caverne à la destinée</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">Autour de David se sont rassemblés des hommes aux parcours difficiles. Leur histoire nous rappelle qu’un point de départ ne détermine pas toute une destinée. Chacun peut grandir, se former et devenir une bénédiction pour les autres.</p>
        </motion.div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="territoires-title">
        <div className="mx-auto max-w-5xl">
          <motion.div {...enter()} className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold">Des progrès visibles</p>
            <h2 id="territoires-title" className="mt-3 font-cinzel text-3xl font-bold sm:text-4xl">Les territoires de la conquête</h2>
            <p className="mt-4 text-sm leading-7 text-white/70">Avancer dans la foi, développer ses capacités et agir avec responsabilité, dans chaque domaine de la vie.</p>
          </motion.div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {territories.map((t, i) => (
              <motion.article key={t.title} {...enter(i * 0.08)} whileHover={reduce ? undefined : { y: -6, scale: 1.015 }} className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.035] p-5 transition-colors duration-300 hover:border-gold/50 hover:bg-white/[0.06]">
                <t.icon className="text-gold" size={22} aria-hidden="true" />
                <h3 className="mt-3 font-cinzel text-base font-semibold">{t.title}</h3>
                <p className="mt-2 text-xs leading-6 text-white/70">{t.text}</p>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-gold transition-transform duration-500 group-hover:scale-x-100" />
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="culte-royal" data-culte-animation="p17" className="relative isolate overflow-hidden border-y border-gold/20 bg-gradient-royal px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="culte-title">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-9 lg:grid-cols-[1.12fr_1fr] lg:gap-12">
          <div className="culte-poster-enter group relative overflow-hidden rounded-2xl border border-gold/35 bg-abyss/70 p-2 shadow-2xl transition-[border-color,box-shadow] duration-500 hover:border-gold/70 hover:shadow-[0_0_45px_rgba(212,175,55,0.18)]">
            {displayCulte?.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayCulte.cover_url} alt={`Affiche du culte : ${displayCulte.title}`} loading="lazy" decoding="async" className="block h-auto w-full rounded-xl object-contain transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.055] motion-reduce:transform-none" />
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 p-8 text-center">
                <span className="font-cinzel text-xs uppercase tracking-[0.24em] text-gold">Rendez-vous royal</span>
                <p className="font-cinzel text-3xl font-bold text-white">Dimanche</p>
                <p className="font-cormorant text-5xl italic text-gold-light">10h30</p>
                <p className="text-sm text-white/70">Louange · Enseignement · Prière · Communion</p>
              </div>
            )}
          </div>
          <div className="culte-content-enter flex flex-col justify-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gold-light">Culte de Célébration Royale · Chapelle Royale</p>
            <h2 id="culte-title" className="culte-title-enter mt-5 font-cinzel text-3xl font-bold leading-[1.2] text-white sm:text-4xl lg:text-[2.5rem]">{displayCulte?.title || 'Culte de Célébration Royale'}</h2>
            <div className="mt-5 h-px w-24 bg-gradient-to-r from-gold to-transparent" aria-hidden="true" />
            {displayCulte?.starts_at ? (
              <p className="mt-5 text-sm font-semibold leading-7 text-gold-light sm:text-base">{new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Abidjan', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(displayCulte.starts_at))} · Heure de Côte d’Ivoire</p>
            ) : (
              <p className="mt-5 text-sm font-semibold text-gold-light sm:text-base">Chaque dimanche · 10h30 · Heure de Côte d’Ivoire</p>
            )}
            <p className="mt-4 max-w-xl whitespace-pre-line text-sm leading-7 text-white/85 sm:text-base">{displayCulte?.description || 'Un rendez-vous pour célébrer Jésus-Christ, recevoir la Parole, prier ensemble et avancer dans la foi. Prenez part à ce temps de communion avec la Chapelle Royale.'}</p>
            <Link href={displayCulte?.slug ? `/evenements/${displayCulte.slug}` : '/evenements'} className="mt-7 inline-flex min-h-11 items-center gap-2 self-start rounded-md border border-gold/60 bg-gold/10 px-5 py-2.5 text-sm font-semibold text-gold-light transition-all duration-300 hover:-translate-y-1 hover:bg-gold/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">{displayCulte ? 'Voir les événements' : 'Découvrir les cultes'} <ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
        <style jsx>{`
          @keyframes culteReveal { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes culteTitleReveal { from { opacity: 0; transform: translateY(16px); letter-spacing: 0.06em; } to { opacity: 1; transform: translateY(0); letter-spacing: normal; } }
          @media (prefers-reduced-motion: no-preference) {
            .culte-poster-enter { animation: culteReveal 850ms ease-out both; }
            .culte-content-enter { animation: culteReveal 850ms 140ms ease-out both; }
            .culte-title-enter { animation: culteTitleReveal 900ms 250ms ease-out both; }
          }
        `}</style>
      </section>
      <section id="prendre-ma-place" className="scroll-mt-28 px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="engagement-title">
        <motion.div {...enter()} className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold">Votre prochain pas</p>
          <h2 id="engagement-title" className="mt-3 font-cinzel text-3xl font-bold sm:text-4xl">Quelle place souhaitez-vous prendre ?</h2>
          <p className="mt-4 text-sm leading-7 text-white/75">Choisissez le chemin qui correspond à votre besoin actuel. Vous pourrez avancer à votre rythme.</p>
        </motion.div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-3 md:grid-cols-3">
          {journeys.map((j, i) => (
            <motion.article key={j.title} {...enter(i * 0.1)} whileHover={reduce ? undefined : { y: -7 }} className="group flex flex-col rounded-lg border border-gold/20 bg-royal/10 p-5 transition-colors duration-300 hover:border-gold/60">
              <j.icon className="text-gold-light" size={23} aria-hidden="true" />
              <h3 className="mt-3 font-cinzel text-base font-semibold">{j.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-6 text-white/70">{j.text}</p>
              <Link href={j.href} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gold-light underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">{j.label} <ArrowRight size={15} aria-hidden="true" /></Link>
            </motion.article>
          ))}
        </div>
        <p className="mx-auto mt-5 max-w-3xl text-center text-xs leading-6 text-white/50">Prototype visuel : les liens conduisent aux parcours existants. Aucun formulaire de campagne ni création automatique de membre n’est activé ici.</p>
      </section>

      <section id="questions" className="border-t border-gold/15 bg-gradient-royal px-5 py-16 sm:px-8 sm:py-24" aria-labelledby="faq-title">
        <div className="mx-auto max-w-3xl">
          <motion.div {...enter()} className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold-light">Tout savoir</p>
            <h2 id="faq-title" className="mt-3 font-cinzel text-3xl font-bold sm:text-4xl">Questions fréquentes</h2>
            <p className="mt-4 text-sm text-white/70">Quelques réponses pour vous aider à faire votre premier pas.</p>
          </motion.div>
          <div className="mt-8 divide-y divide-gold/20 border-y border-gold/20">
            {faqs.map((faq, i) => (
              <motion.div key={faq.question} {...enter(i * 0.06)}>
                <button type="button" aria-expanded={openFaq === i} aria-controls={`vaillants-faq-${i}`} onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full min-h-16 items-center justify-between gap-5 py-4 text-left font-cinzel text-sm font-semibold text-white transition-colors hover:text-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold sm:text-base">
                  <span>{faq.question}</span>
                  <motion.span aria-hidden="true" animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: reduce ? 0 : 0.25 }} className="shrink-0 text-xl font-normal text-gold">+</motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === i && (
                    <motion.div id={`vaillants-faq-${i}`} key="answer" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.32 }} className="overflow-hidden">
                      <p className="max-w-2xl pb-5 pr-8 text-sm leading-7 text-white/75">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

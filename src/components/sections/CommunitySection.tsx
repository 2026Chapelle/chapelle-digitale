'use client'
/**
 * SCÈNE 6 — COMMUNAUTÉ
 * Grande photo réelle + témoignage réel (si disponible).
 * Pas de fausse donnée. Pas de formulaire dashboard.
 */
import { useRef, useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Quote, ArrowRight } from 'lucide-react'
import { supabase, IS_DEMO_MODE } from '@/lib/supabase'
import { events } from '@/lib/analytics'
import {
  HOME_VIEWPORT,
  HOME_DELAY,
  revealInitial,
  revealVisible,
  revealTransition,
} from '@/lib/home-motion'

type Testimony = { id: string; auteur: string; lieu: string; titre: string; texte: string }

/** Photo réelle locale — famille / maison. */
const COMMUNITY_PHOTO = {
  src: '/images/platformes/familles-chapelle.webp',
  alt: 'Familles de la Chapelle — vie de communauté',
}

export function CommunitySection() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [items, setItems] = useState<Testimony[]>([])

  useEffect(() => {
    if (IS_DEMO_MODE) return
    let cancelled = false
    ;(async () => {
      try {
        const [cms, workflow] = await Promise.all([
          supabase
            .from('cms_testimonies')
            .select('id, author_name, location, title, body')
            .in('status', ['approved', 'published'])
            .limit(4),
          supabase
            .from('temoignages')
            .select('id, auteur, pays, titre, corps')
            .eq('is_public', true)
            .limit(4),
        ])
        if (cancelled) return
        const a: Testimony[] = (cms.data || []).map((t: Record<string, unknown>) => ({
          id: `c-${t.id}`,
          auteur: (t.author_name as string) || 'Anonyme',
          lieu: (t.location as string) || '',
          titre: (t.title as string) || '',
          texte: (t.body as string) || '',
        }))
        const b: Testimony[] = (workflow.data || []).map((t: Record<string, unknown>) => ({
          id: `w-${t.id}`,
          auteur: (t.auteur as string) || 'Anonyme',
          lieu: (t.pays as string) || '',
          titre: (t.titre as string) || '',
          texte: (t.corps as string) || '',
        }))
        setItems([...a, ...b].filter((t) => t.texte).slice(0, 1))
      } catch {
        /* aucun témoignage */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const testimony = items[0]

  return (
    <section ref={ref} className="section-cinematic" aria-labelledby="community-title">
      <div className="container-cinematic max-w-5xl">
        <motion.div
          initial={revealInitial(reduce)}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.title)}
          className="text-center mb-10 md:mb-14"
        >
          <h2 id="community-title" className="heading-cinematic-lg">
            Tu n&apos;es
            <span className="block text-cinematic-gold">pas seul.</span>
          </h2>
          <p
            className="font-cormorant italic mt-5 md:mt-6 mx-auto max-w-md leading-relaxed"
            style={{
              fontSize: 'clamp(0.95rem, 1.4vw, 1.15rem)',
              color: 'rgba(235,217,160,0.42)',
            }}
          >
            « Portez les fardeaux les uns des autres, et vous accomplirez ainsi la loi de Christ. »
            <span className="block font-inter not-italic text-[10px] tracking-[0.18em] uppercase mt-2" style={{ color: 'rgba(235,217,160,0.28)' }}>
              Galates 6.2
            </span>
          </p>
        </motion.div>

        {/* Grande photographie réelle */}
        <motion.div
          initial={revealInitial(reduce, { y: 40, blur: true })}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.body)}
          className="relative w-full aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden mb-12 md:mb-16"
        >
          <Image
            src={COMMUNITY_PHOTO.src}
            alt={COMMUNITY_PHOTO.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 40%, rgba(6,6,10,0.75) 100%), radial-gradient(ellipse at center, transparent 30%, rgba(6,6,10,0.35) 100%)',
            }}
            aria-hidden
          />
        </motion.div>

        {/* Citation / témoignage réel uniquement */}
        <motion.div
          initial={revealInitial(reduce, { y: 36 })}
          whileInView={revealVisible()}
          viewport={HOME_VIEWPORT}
          transition={revealTransition(reduce, HOME_DELAY.cta)}
          className="max-w-2xl mx-auto text-center"
        >
          {testimony ? (
            <>
              <Quote
                className="w-7 h-7 mx-auto mb-5"
                style={{ color: 'rgba(212,175,55,0.45)' }}
                fill="currentColor"
              />
              {testimony.titre && (
                <p className="font-cinzel font-bold text-pearl text-lg mb-3">{testimony.titre}</p>
              )}
              <blockquote
                className="font-cormorant italic text-xl md:text-2xl leading-relaxed mb-6"
                style={{ color: 'rgba(245,230,216,0.78)' }}
              >
                « {testimony.texte.length > 280 ? `${testimony.texte.slice(0, 280).trim()}…` : testimony.texte} »
              </blockquote>
              <p className="font-inter text-sm mb-10" style={{ color: '#D4AF37' }}>
                {testimony.auteur}
                {testimony.lieu ? ` · ${testimony.lieu}` : ''}
              </p>
            </>
          ) : (
            <>
              <Quote
                className="w-7 h-7 mx-auto mb-5"
                style={{ color: 'rgba(212,175,55,0.45)' }}
                fill="currentColor"
              />
              <p
                className="font-cormorant italic text-xl md:text-2xl leading-relaxed mb-10"
                style={{ color: 'rgba(245,230,216,0.7)' }}
              >
                Une maison qui accueille, prie et grandit avec toi.
              </p>
            </>
          )}

          <Link
            href="/temoignages"
            onClick={() => events.ctaClick('lire_temoignages')}
            className="inline-flex items-center gap-2 text-sm font-inter transition-colors hover:text-gold"
            style={{ color: 'rgba(235,217,160,0.55)' }}
          >
            Lire les témoignages
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

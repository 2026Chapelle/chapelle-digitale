'use client'
/**
 * PODCAST-1 — Hero « À LA UNE » administrable (bloc cms_homepage_blocks `podcast_hero`).
 * Large mais pas gigantesque ; image valorisée sans overlay excessif ; identité Citadelle
 * (violet profond / or). Fallback propre si aucun bloc n'est configuré.
 */
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Mic } from 'lucide-react'
import type { PodcastHeroConfig } from '@/lib/podcast/sections'

export function PodcastHero({ hero, imageFit = 'cover' }: { hero: PodcastHeroConfig | null; imageFit?: 'cover' | 'contain' }) {
  const eyebrow = hero?.eyebrow || 'À la une'
  const title = hero?.title || 'La Voix du Royaume'
  const description =
    hero?.description ||
    'Podcasts, séries et enseignements audio pour nourrir ta foi — où que tu sois, à toute heure.'
  const image = hero?.image || null
  const ctaLabel = hero?.ctaLabel
  const ctaHref = hero?.ctaHref

  return (
    <section className="mb-10 md:mb-14 px-4 md:px-0" aria-label="À la une">
      <div
        className="relative overflow-hidden rounded-2xl md:rounded-3xl"
        style={{ border: '1px solid rgba(212,175,55,0.18)' }}
      >
        <div className="grid md:grid-cols-2 items-stretch">
          {/* Contenu éditorial */}
          <div className="relative z-[2] p-6 sm:p-8 md:p-12 flex flex-col justify-center order-2 md:order-1"
            style={{ background: 'linear-gradient(135deg, rgba(30,20,55,0.96) 0%, rgba(10,10,18,0.96) 100%)' }}>
            <p className="section-label-dark mb-3 inline-flex items-center gap-2">
              <Mic className="w-3.5 h-3.5 text-gold" aria-hidden /> {eyebrow}
            </p>
            <h1 className="font-cinzel font-bold text-pearl text-2xl sm:text-3xl md:text-4xl leading-tight mb-3">
              {title}
            </h1>
            <p className="font-inter text-sm md:text-base leading-relaxed max-w-md mb-6" style={{ color: 'rgba(245,230,216,0.6)' }}>
              {description}
            </p>
            {ctaLabel && ctaHref && (
              <Link
                href={ctaHref}
                className="btn-gold-cinematic self-start group inline-flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
                style={{ padding: '12px 24px', fontSize: '0.9rem' }}
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            )}
          </div>

          {/* Image (ou motif de repli). `contain` : cover carrée non recadrée, centrée
              sur un fond violet/or (aucune typo essentielle coupée). */}
          <div className="relative min-h-[200px] md:min-h-[340px] order-1 md:order-2"
            style={imageFit === 'contain' && image
              ? { background: 'radial-gradient(ellipse at 60% 45%, rgba(212,175,55,0.12), transparent 62%), linear-gradient(135deg, #1e1440 0%, #0a0a12 100%)' }
              : undefined}>
            {image ? (
              <Image src={image} alt={title} fill sizes="(max-width: 768px) 100vw, 50vw"
                className={imageFit === 'contain' ? 'object-contain p-4 md:p-6' : 'object-cover'} priority />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(212,175,55,0.16), transparent 60%), linear-gradient(135deg, #1e3a8a 0%, #0a0a12 100%)' }}>
                <Mic className="w-16 h-16 md:w-24 md:h-24 text-gold/25" aria-hidden />
              </div>
            )}
            {/* Liaison douce vers le panneau texte côté desktop */}
            <div className="hidden md:block absolute inset-y-0 left-0 w-24 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, rgba(10,10,18,0.96), transparent)' }} aria-hidden />
          </div>
        </div>
      </div>
    </section>
  )
}

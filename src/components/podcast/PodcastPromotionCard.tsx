'use client'
/**
 * PODCAST — Carte de PROMOTION NATIVE (bloc cms_homepage_blocks `podcast_promo`).
 * Variante visuelle éditoriale/élégante (identité Citadelle : violet profond, accents or,
 * cinématique) pensée pour s'intercaler ENTRE une section de découverte et le catalogue
 * complet. PAS un bandeau publicitaire criard : bande large, mention discrète, ton natif.
 *
 * Présentational pur (aucune I/O). La page garde le rendu :
 *   {promotion && <PodcastPromotionCard promotion={promotion} />}
 * → ce composant suppose `promotion` non nul (le parseur FAIL-SAFE renvoie null si vide).
 */
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import { PROMOTION_KIND_LABELS, type PodcastPromotion } from '@/lib/podcast/promotion'

export function PodcastPromotionCard({ promotion }: { promotion: PodcastPromotion }) {
  const { kind, eyebrow, title, description, image, ctaHref } = promotion
  const kindLabel = PROMOTION_KIND_LABELS[kind]
  const ctaLabel = promotion.ctaLabel || 'En savoir plus'
  // Nom accessible robuste : le titre peut être vide (promo image seule) → repli lisible.
  const accessibleName = title || eyebrow || kindLabel

  return (
    <section className="mb-12 md:mb-16 px-4 md:px-0" aria-label={`${kindLabel} : ${accessibleName}`}>
      <div
        className="relative overflow-hidden rounded-2xl md:rounded-3xl"
        style={{ border: '1px solid rgba(212,175,55,0.18)' }}
      >
        <div className="grid md:grid-cols-[1fr_0.85fr] items-stretch">
          {/* Contenu éditorial */}
          <div
            className="relative z-[2] p-6 sm:p-8 md:p-10 flex flex-col justify-center order-2 md:order-1"
            style={{ background: 'linear-gradient(135deg, rgba(30,20,55,0.96) 0%, rgba(10,10,18,0.96) 100%)' }}
          >
            {/* Puce de mention — lisible SANS la seule couleur (libellé texte explicite) */}
            <span
              className="inline-flex w-fit items-center gap-1.5 text-[10px] font-inter font-bold tracking-widest uppercase px-2.5 py-1 rounded-full mb-3"
              style={{ background: 'rgba(212,175,55,0.14)', color: '#F5E6A7', border: '1px solid rgba(212,175,55,0.32)' }}
            >
              <Sparkles className="w-2.5 h-2.5" aria-hidden /> {kindLabel}
            </span>

            {eyebrow && (
              <p className="section-label-dark mb-2">{eyebrow}</p>
            )}

            {title && (
              <h2 className="font-cinzel font-bold text-pearl text-xl sm:text-2xl md:text-3xl leading-tight mb-3">
                {title}
              </h2>
            )}

            {description && (
              <p
                className="font-inter text-sm md:text-base leading-relaxed max-w-md mb-6 line-clamp-2"
                style={{ color: 'rgba(245,230,216,0.6)' }}
              >
                {description}
              </p>
            )}

            {ctaHref && (
              <Link
                href={ctaHref}
                className="btn-gold-cinematic self-start group inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
                style={{ padding: '12px 24px', fontSize: '0.9rem' }}
              >
                {ctaLabel}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            )}
          </div>

          {/* Image (ou motif de repli élégant — jamais d'image cassée) */}
          <div className="relative min-h-[180px] md:min-h-[300px] order-1 md:order-2">
            {image ? (
              <Image
                src={image}
                alt={accessibleName}
                fill
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'radial-gradient(ellipse at 60% 40%, rgba(212,175,55,0.16), transparent 60%), linear-gradient(135deg, #1e1440 0%, #0a0a12 100%)' }}
                aria-hidden
              >
                <Sparkles className="w-14 h-14 md:w-20 md:h-20 text-gold/25" />
              </div>
            )}
            {/* Liaison douce vers le panneau texte côté desktop */}
            <div
              className="hidden md:block absolute inset-y-0 left-0 w-24 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, rgba(10,10,18,0.96), transparent)' }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  )
}

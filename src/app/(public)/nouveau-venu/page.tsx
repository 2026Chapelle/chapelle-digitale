import type { Metadata } from 'next'
import Image from 'next/image'
import { NouveauVenuForm } from './NouveauVenuForm'

export const metadata: Metadata = {
  title: 'Bienvenue — Nouveau venu | La Citadelle',
  description: "Vous êtes nouveau à La Citadelle ? Laissez-nous vos coordonnées : notre équipe d'accueil vous contactera.",
  alternates: { canonical: '/nouveau-venu' },
}

export default function NouveauVenuPage() {
  return (
    <div className="min-h-screen pb-20">
      <section className="relative overflow-hidden pt-32 pb-8 px-4">
        <div className="absolute inset-0 pointer-events-none"><div className="halo-gold w-[1000px] h-[560px] -top-40 left-1/2 -translate-x-1/2" /></div>
        <div className="max-w-xl mx-auto relative text-center">
          <div className="section-label-dark justify-center">🕊️ Accueil</div>
          <h1 className="heading-cinematic-xl mb-4">Bienvenue à <span className="text-cinematic-gold">La Citadelle</span></h1>
          <p className="text-base font-inter leading-relaxed mx-auto max-w-md" style={{ color: 'rgba(245,230,216,0.6)' }}>
            Vous êtes nouveau parmi nous ? Laissez-nous vos coordonnées : notre équipe d&apos;accueil vous contactera pour vous accompagner dans vos premiers pas.
          </p>
        </div>
      </section>

      {/* Séparateur élégant hero ↔ section formulaire */}
      <div className="max-w-xs mx-auto mb-10 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }} />

      <section className="relative isolate max-w-5xl mx-auto px-4">
        {/* Halo doré très subtil + profondeur en arrière-plan */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 -z-10 mx-auto w-[94%] h-[78%] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 28% 30%, rgba(212,175,55,0.13), transparent 60%), radial-gradient(ellipse at 82% 78%, rgba(75,0,130,0.10), transparent 60%)", filter: "blur(6px)" }} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Colonne gauche — image d'accueil réelle (masquée sur mobile pour la lisibilité). */}
          <div className="hidden lg:block">
            <div className="relative h-full min-h-[480px] rounded-3xl overflow-hidden"
              style={{ border: "1px solid rgba(212,175,55,0.28)", boxShadow: "0 30px 80px -24px rgba(0,0,0,0.75)" }}>
              {/* Photo d'accueil (fichier réel dans public/) */}
              <Image
                src="/images/nouveau-venu/accueil.png"
                alt="Accueil chaleureux à La Citadelle"
                fill
                sizes="(max-width: 1024px) 0px, 480px"
                className="object-cover"
              />
              {/* Overlay dégradé sombre/or raffiné (lisibilité du texte) */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,3,8,0.05) 0%, rgba(5,3,8,0.30) 45%, rgba(5,3,8,0.92) 100%)" }} />
              {/* Vignette : assombrit délicatement les bords */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)" }} />
              {/* Lumière douce dorée en haut à gauche */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 28% 14%, rgba(212,175,55,0.28) 0%, transparent 46%)" }} />
              {/* Liseré doré interne subtil */}
              <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: "inset 0 0 0 1px rgba(212,175,55,0.18)" }} />
              {/* Texte conservé */}
              <div className="relative h-full flex flex-col justify-end p-8">
                <h2 className="font-cinzel text-2xl font-black text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">Bienvenue dans la famille</h2>
                <p className="font-inter text-sm mt-2 max-w-xs drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ color: "rgba(245,230,216,0.94)" }}>
                  Nous sommes heureux de vous accueillir à La Citadelle.
                </p>
              </div>
            </div>
          </div>

          {/* Colonne droite — formulaire (logique inchangée). Cadre premium enveloppant, sans toucher NouveauVenuForm. */}
          <div className="flex items-center">
            <div className="relative w-full">
              {/* Glow + ombre premium autour de la carte du formulaire */}
              <div aria-hidden className="absolute -inset-2 rounded-[28px] pointer-events-none"
                style={{ background: "linear-gradient(160deg, rgba(212,175,55,0.12), transparent 62%)", boxShadow: "0 30px 80px -30px rgba(0,0,0,0.7)" }} />
              <div className="relative">
                <NouveauVenuForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

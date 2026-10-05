import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Heart,
  Sparkles,
} from 'lucide-react'

export const metadata: Metadata = {
  title: '10 Jours dans la Chambre Haute — Revêtus de Puissance',
  description:
    'Retraite Mahanaïm de 10 jours de jeûne, de prière, de consécration et d’effusion, du 10 au 19 octobre 2026 à 05h30.',
  alternates: {
    canonical:
      '/plateformes/mahanaim/retraites/chambre-haute-2026',
  },
}

const MEMBER_RETREAT =
  '/member/plateformes/mahanaim/retraites/chambre-haute-2026'

const LOGIN_HREF =
  '/login?next=%2Fmember%2Fplateformes%2Fmahanaim%2Fretraites%2Fchambre-haute-2026'

const REGISTER_HREF =
  '/register?next=%2Fmember%2Fplateformes%2Fmahanaim%2Fretraites%2Fchambre-haute-2026'

const days = [
  ['01', '10 oct.', 'Montez dans la Chambre Haute'],
  ['02', '11 oct.', 'Purifiez l’autel'],
  ['03', '12 oct.', 'Demeurez jusqu’à…'],
  ['04', '13 oct.', 'Un seul cœur, une seule âme'],
  ['05', '14 oct.', 'Attendez la Promesse du Père'],
  ['06', '15 oct.', 'Le Saint-Esprit viendra sur vous'],
  ['07', '16 oct.', 'Revêtus de puissance'],
  ['08', '17 oct.', 'Que le feu demeure'],
  ['09', '18 oct.', 'Vous serez mes témoins'],
  ['10', '19 oct.', 'Sortez de la Chambre Haute'],
]

export default function ChambreHautePublicPage() {
  return (
    <main className="min-h-screen bg-[#07030d] text-white">
      <section className="relative overflow-hidden px-4 pb-20 pt-28 md:pb-28 md:pt-36">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(circle at 50% 0%, rgba(109,40,217,.28), transparent 42%), radial-gradient(circle at 85% 45%, rgba(212,175,55,.15), transparent 32%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
          aria-hidden
          style={{
            background:
              'linear-gradient(180deg, transparent, #07030d)',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-4xl text-center">
            <Link
              href="/plateformes/mahanaim"
              className="inline-flex items-center rounded-full border border-violet-300/20 bg-violet-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-violet-200 transition hover:bg-violet-500/15"
            >
              Mahanaïm · Citadelle
            </Link>

            <p className="mt-10 font-cinzel text-sm font-bold uppercase tracking-[0.28em] text-[#D4AF37]">
              Retraite numérique · 10 jours
            </p>

            <h1 className="mt-5 font-cinzel text-4xl font-black leading-tight md:text-6xl lg:text-7xl">
              10 Jours dans la
              <span className="block text-[#D4AF37]">
                Chambre Haute
              </span>
            </h1>

            <p className="mt-6 font-cormorant text-2xl italic text-white/80 md:text-3xl">
              Revêtus de Puissance
            </p>

            <blockquote className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
              « Jusqu&apos;à ce que vous soyez revêtus de
              puissance »
              <span className="mt-2 block font-semibold text-[#D4AF37]">
                Luc 24:49
              </span>
            </blockquote>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">
                <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                10–19 octobre 2026 · Clôture le 20 octobre
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70">
                <Clock3 className="h-4 w-4 text-[#D4AF37]" />
                Chaque jour à 05h30
              </span>
            </div>

            <p className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/[0.58]">
              Dix jours de jeûne, de prière, de consécration,
              d&apos;attente et d&apos;effusion pour entrer dans
              une nouvelle dimension de communion, de puissance
              et d&apos;envoi.
            </p>

            <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href={LOGIN_HREF}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-7 py-4 font-inter text-sm font-black tracking-wide text-[#130d02] shadow-[0_14px_45px_rgba(212,175,55,.22)] transition hover:-translate-y-0.5 hover:bg-[#ead06d]"
              >
                JE PARTICIPE AUX 10 JOURS
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href={REGISTER_HREF}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] px-7 py-4 font-inter text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
              >
                Je n&apos;ai pas encore de compte
              </Link>
            </div>

            <p className="mt-4 text-xs text-white/35">
              L&apos;inscription à la retraite est gratuite avec
              un compte Citadelle.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden px-4 pb-12 pt-16 md:pb-14 md:pt-20">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(109,40,217,.16), transparent 48%), radial-gradient(circle at 82% 25%, rgba(212,175,55,.10), transparent 30%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
              Mahanaïm
            </p>
            <h2 className="mt-3 font-cinzel text-2xl font-black md:text-3xl">
              L’AFFICHE OFFICIELLE
            </h2>
          </div>

          <figure className="mx-auto mt-9 max-w-[1200px]">
            <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#07030d] p-1 shadow-[0_24px_70px_rgba(0,0,0,.42),0_0_45px_rgba(109,40,217,.12)] md:rounded-3xl">
              <Image
                src="/images/mahanaim/chambre-haute-2026-affiche.png"
                alt="Affiche officielle des 10 Jours dans la Chambre Haute — Revêtus de Puissance — Mahanaïm"
                width={1672}
                height={941}
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 92vw, 1200px"
                className="h-auto w-full object-contain"
              />
            </div>

            <figcaption className="mt-5 text-center">
              <p className="text-sm text-white/65">
                10 jours de retraite · 10–19 octobre · Clôture le 20 octobre 2026
              </p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {[
            {
              icon: Heart,
              title: 'Se consacrer',
              text: 'Créer un espace volontaire de retrait, de purification et de retour à Dieu.',
            },
            {
              icon: Flame,
              title: 'Attendre et recevoir',
              text: 'Demeurer dans la présence de Dieu et se disposer à l’action du Saint-Esprit.',
            },
            {
              icon: Sparkles,
              title: 'Être envoyé',
              text: 'Recevoir pour servir, témoigner et avancer avec une puissance renouvelée.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-7"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10">
                <Icon className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <h2 className="mt-5 font-cinzel text-xl font-bold">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-300">
              Le parcours
            </p>
            <h2 className="mt-3 font-cinzel text-3xl font-black md:text-4xl">
              Dix jours, une progression
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
              Chaque journée ouvre une étape de la retraite. Le
              contenu du jour devient accessible selon le rythme
              prévu dans Citadelle.
            </p>
          </div>

          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {days.map(([number, date, title]) => (
              <article
                key={number}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4"
              >
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-violet-500/[0.12] font-cinzel text-sm font-black text-violet-200">
                  {number}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-[#D4AF37]/90">
                    {date}
                  </p>
                  <p className="mt-1 font-inter text-sm font-semibold text-white/90">
                    {title}
                  </p>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 flex-none text-white/25" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-28 pt-12">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/10 via-violet-900/10 to-transparent p-8 text-center md:p-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            La Chambre Haute vous attend
          </p>
          <h2 className="mt-4 font-cinzel text-3xl font-black md:text-4xl">
            Prenez votre place pour les 10 jours
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55">
            Après votre connexion ou la création de votre compte,
            Citadelle vous ramènera directement vers la retraite
            pour confirmer votre participation.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={LOGIN_HREF}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-7 py-4 font-inter text-sm font-black text-[#130d02] transition hover:bg-[#ead06d]"
            >
              JE PARTICIPE AUX 10 JOURS
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={MEMBER_RETREAT}
              className="inline-flex min-h-14 items-center justify-center rounded-2xl border border-white/[0.12] px-7 py-4 font-inter text-sm font-semibold text-white/70 transition hover:bg-white/[0.05]"
            >
              Accéder à mon espace retraite
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

import {
  notFound,
} from 'next/navigation'

import EnrollRetreatButton from '@/components/mahanaim/EnrollRetreatButton'

import {
  CHAMBRE_HAUTE_SLUG,
  getMemberRetreatBySlug,
} from '@/lib/mahanaim/member-retreats-server'

export const dynamic =
  'force-dynamic'

const FIRST_RETREAT_SLUG =
  'chambre-haute-2026'

const CTA_LABEL =
  'JE PARTICIPE AUX 10 JOURS'

type Props = {
  params: {
    slug: string
  }
}

export default async function MahanaimRetreatPage({
  params,
}: Props) {
  if (
    params.slug !==
      FIRST_RETREAT_SLUG &&
    params.slug !==
      CHAMBRE_HAUTE_SLUG
  ) {
    notFound()
  }

  const retreat =
    await getMemberRetreatBySlug(
      params.slug,
    )

  if (!retreat) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <section className="rounded-3xl border border-amber-400/20 bg-slate-950 p-8 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
          Mahanaïm · Retraite
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-5xl">
          {retreat.theme}
        </h1>

        {retreat.subtitle ? (
          <p className="mt-4 text-lg text-slate-300">
            {retreat.subtitle}
          </p>
        ) : null}

        {retreat.scriptureReference ? (
          <p className="mt-6 font-semibold text-amber-200">
            {retreat.scriptureReference}
          </p>
        ) : null}

        {retreat.scriptureText ? (
          <blockquote className="mt-2 border-l-2 border-amber-400 pl-4 text-slate-200">
            {retreat.scriptureText}
          </blockquote>
        ) : null}

        {retreat.description ? (
          <p className="mt-6 max-w-3xl text-slate-300">
            {retreat.description}
          </p>
        ) : null}

        <div className="mt-8 max-w-xl">
          <EnrollRetreatButton
            slug={retreat.slug}
            label={CTA_LABEL}
            initiallyEnrolled={
              retreat.enrolled
            }
          />
        </div>
      </section>

      {retreat.enrolled ? (
        <section>
          <h2 className="text-2xl font-bold">
            Parcours des 10 jours
          </h2>

          <div className="mt-5 grid gap-4">
            {retreat.days.map(
              day => (
                <article
                  key={day.id}
                  className={[
                    'rounded-2xl border p-5',
                    day.isUnlocked
                      ? 'border-emerald-400/30 bg-emerald-950/20'
                      : 'border-white/10 bg-white/5 opacity-75',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-violet-300">
                      Jour {String(day.dayNumber).padStart(2, '0')}
                      {' · '}
                      {day.dayDate}
                    </p>

                    <span
                      className={[
                        'rounded-full px-3 py-1 text-xs font-semibold',
                        day.isUnlocked
                          ? 'bg-emerald-400/15 text-emerald-200'
                          : 'bg-slate-700/70 text-slate-200',
                      ].join(' ')}
                    >
                      {day.isUnlocked
                        ? 'Disponible'
                        : '🔒 Verrouillé'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-semibold">
                    {day.title}
                  </h3>

                  {day.scriptureReference ? (
                    <p className="mt-2 text-sm text-slate-400">
                      {day.scriptureReference}
                    </p>
                  ) : null}

                  {!day.isUnlocked ? (
                    <p className="mt-3 text-sm text-slate-400">
                      Disponible le {day.dayDate} à {retreat.dailyStartTime.slice(0, 5)}
                    </p>
                  ) : null}
                </article>
              ),
            )}
          </div>
        </section>
      ) : null}
    </main>
  )
}

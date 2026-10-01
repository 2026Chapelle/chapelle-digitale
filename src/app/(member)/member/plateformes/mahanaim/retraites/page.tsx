import Link from 'next/link'

import {
  listMemberRetreats,
} from '@/lib/mahanaim/member-retreats-server'

export const dynamic =
  'force-dynamic'

export default async function MahanaimRetreatsPage() {
  const retreats =
    await listMemberRetreats()

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-300">
          Mahanaïm
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          Retraites
        </h1>
      </header>

      {retreats.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          Aucune retraite n’est disponible pour le moment.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {retreats.map(
            retreat => (
              <article
                key={retreat.id}
                className="rounded-2xl border border-violet-400/20 bg-slate-950 p-6 text-white"
              >
                <p className="text-sm text-violet-300">
                  {retreat.startDate}
                  {' — '}
                  {retreat.endDate}
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  {retreat.theme}
                </h2>

                {retreat.subtitle ? (
                  <p className="mt-3 text-slate-300">
                    {retreat.subtitle}
                  </p>
                ) : null}

                <div className="mt-6">
                  <Link
                    href={`/member/plateformes/mahanaim/retraites/${retreat.slug}`}
                    className="font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Ouvrir la retraite →
                  </Link>
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </main>
  )
}
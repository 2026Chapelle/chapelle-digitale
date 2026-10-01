import Link from 'next/link'

export const dynamic =
  'force-dynamic'

export default function MahanaimMemberPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <section className="rounded-3xl border border-violet-400/20 bg-slate-950 p-8 text-white">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-violet-300">
          Mahanaïm
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-5xl">
          Le camp de prière de la Citadelle
        </h1>

        <p className="mt-4 max-w-2xl text-slate-300">
          Retraites, intercession, consécration et rendez-vous de prière.
        </p>

        <div className="mt-8">
          <Link
            href="/member/plateformes/mahanaim/retraites"
            className="inline-flex rounded-xl bg-violet-500 px-5 py-3 font-semibold text-white transition hover:bg-violet-400"
          >
            Découvrir les retraites
          </Link>
        </div>
      </section>
    </main>
  )
}
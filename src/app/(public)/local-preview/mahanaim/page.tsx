import { notFound } from 'next/navigation'
import MahanaimRetreatJourney from '@/components/mahanaim/MahanaimRetreatJourney'
import { isMahanaimLocalPreviewEnabled } from '@/lib/mahanaim/local-preview'
import { resolveMahanaimDayImageUrl } from '@/lib/mahanaim/retreat-day-images'

const days = Array.from({ length: 10 }, (_, index) => {
  const dayNumber = index + 1
  const isUnlocked = dayNumber <= 3

  return {
    id: `local-preview-day-${dayNumber}`,
    dayNumber,
    dayDate: `2026-10-${String(dayNumber).padStart(2, '0')}`,
    title: `Journée fictive ${dayNumber}`,
    scriptureReference: 'Actes 1:8',
    isUnlocked,
    imageUrl: resolveMahanaimDayImageUrl(dayNumber, null),
    content: isUnlocked
      ? {
          scriptureText:
            'Contenu fictif de prévisualisation locale — aucune donnée membre ni donnée Supabase n’est utilisée.',
          objective: 'Prier avec foi et persévérance.',
          meditation: 'Cette démonstration vérifie uniquement la mise en page et les états de la retraite.',
          prayers: ['Prière fictive de démonstration.'],
          declarations: ['Déclaration fictive de démonstration.'],
          action: 'Prendre un temps de silence.',
        }
      : null,
  }
})

export default function MahanaimLocalPreviewPage() {
  if (!isMahanaimLocalPreviewEnabled(process.env)) notFound()

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <section className="rounded-3xl border border-sky-300/30 bg-sky-300/10 p-5 text-sky-50">
        <p className="text-sm font-bold uppercase tracking-[.2em]">Prévisualisation locale uniquement</p>
        <h1 className="mt-2 text-3xl font-bold">MAHANAÏM P0.3 — données fictives</h1>
        <p className="mt-3 max-w-3xl text-sm text-sky-100/80">
          Aucune connexion Supabase, authentification ou ressource membre réelle n’est utilisée sur cette route.
        </p>
      </section>
      <MahanaimRetreatJourney days={days} showResources={false} />
    </main>
  )
}

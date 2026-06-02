import type { Metadata } from 'next'

/**
 * Layout des pages de formation. Aucune donnée fictive : les métadonnées sont
 * dérivées du slug (réel) et le détail est chargé depuis Supabase par la page.
 * Pages rendues à la demande (pas de pré-génération sur des slugs mock).
 */
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const nom = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    title: `${nom} — Formation`,
    description: 'Formation de la Chapelle Internationale des Élus du Royaume (CIER).',
    alternates: { canonical: `/formations/${params.slug}` },
  }
}

export default function FormationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

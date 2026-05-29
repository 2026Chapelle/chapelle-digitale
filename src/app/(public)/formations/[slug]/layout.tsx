import type { Metadata } from 'next'
import { FORMATIONS } from '@/lib/mock/formations'
import { ogImage } from '@/lib/og'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cier.org'

export async function generateStaticParams() {
  return FORMATIONS.map((f) => ({ slug: f.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const formation = FORMATIONS.find((f) => f.slug === params.slug)
  if (!formation) return { title: 'Formation introuvable' }
  const title = `${formation.titre} — Formation ${formation.niveau}`
  return {
    title,
    description: formation.description,
    keywords: [formation.titre, formation.categorie, ...(formation.tags ?? []), 'formation chrétienne', 'CIER'],
    openGraph: {
      title: `${title} | CIER`,
      description: formation.description,
      type: 'article',
      url: `/formations/${formation.slug}`,
      images: [
        ogImage({
          eyebrow: `Formation · ${formation.niveau}`,
          title: formation.titre,
          subtitle: formation.description,
        }),
      ],
    },
    alternates: { canonical: `/formations/${formation.slug}` },
  }
}

export default function FormationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const formation = FORMATIONS.find((f) => f.slug === params.slug)
  const courseLd = formation && {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: formation.titre,
    description: formation.description,
    url: `${APP_URL}/formations/${formation.slug}`,
    provider: {
      '@type': 'Organization',
      name: 'La Chapelle Internationale des Élus du Royaume',
      sameAs: APP_URL,
    },
    educationalLevel: formation.niveau,
    timeRequired: formation.duree,
    inLanguage: 'fr-FR',
    instructor: formation.instructeur ? {
      '@type': 'Person',
      name: formation.instructeur,
    } : undefined,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'Online',
      inLanguage: 'fr-FR',
    },
  }

  const breadcrumbLd = formation && {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Formations', item: `${APP_URL}/formations` },
      { '@type': 'ListItem', position: 3, name: formation.titre, item: `${APP_URL}/formations/${formation.slug}` },
    ],
  }

  return (
    <>
      {courseLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(courseLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      {children}
    </>
  )
}

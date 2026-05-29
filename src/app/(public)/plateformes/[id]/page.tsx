import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PLATEFORMES } from '@/lib/constants'
import { ogImage } from '@/lib/og'
import PlateformePage from './PlateformePage'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cier.org'

export async function generateStaticParams() {
  return Object.keys(PLATEFORMES).map((id) => ({ id }))
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const plateforme = PLATEFORMES[params.id as keyof typeof PLATEFORMES]
  if (!plateforme) return {}
  const title = `${plateforme.nom} — ${plateforme.slogan}`
  return {
    title,
    description: plateforme.description,
    openGraph: {
      title: `${title} | CIER`,
      description: plateforme.description,
      type: 'website',
      url: `/plateformes/${params.id}`,
      images: [
        ogImage({
          eyebrow: 'Plateforme CIER',
          title: plateforme.nom,
          subtitle: plateforme.slogan,
        }),
      ],
    },
    alternates: { canonical: `/plateformes/${params.id}` },
  }
}

export default function Page({ params }: { params: { id: string } }) {
  const plateforme = PLATEFORMES[params.id as keyof typeof PLATEFORMES]
  if (!plateforme) notFound()

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Plateformes', item: `${APP_URL}/plateformes` },
      { '@type': 'ListItem', position: 3, name: plateforme.nom, item: `${APP_URL}/plateformes/${params.id}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <PlateformePage plateforme={plateforme} />
    </>
  )
}

import type { Metadata } from 'next'
import RejoindreContent from './RejoindreContent'
import { FAQ_ITEMS } from './faq-data'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'

export const metadata: Metadata = {
  title: 'Rejoindre la Chapelle — Votre parcours commence ici',
  description:
    'Faites le premier pas vers la Chapelle Internationale des Élus du Royaume. Un parcours d’accompagnement de Visiteur à Responsable, une église digitale mondiale, un accueil personnel. Gratuit pour commencer.',
  keywords: [
    'rejoindre église en ligne', 'devenir membre église francophone', 'parcours spirituel',
    'intégration église digitale', 'communauté chrétienne mondiale', 'CIER rejoindre',
  ],
  alternates: { canonical: '/rejoindre' },
  openGraph: {
    type: 'website',
    url: '/rejoindre',
    title: 'Rejoindre la Chapelle — Votre parcours commence ici',
    description: 'Faites le premier pas. Un accueil personnel et un accompagnement de Visiteur à Responsable.',
    images: [{
      url: '/api/og?title=Votre%20parcours%20commence%20ici&subtitle=Rejoignez%20la%20Chapelle%20Internationale%20des%20%C3%89lus%20du%20Royaume',
      width: 1200, height: 630, alt: 'Rejoindre la Chapelle Internationale des Élus du Royaume',
    }],
  },
}

export default function RejoindrePage() {
  // Schema.org FAQPage — rich results pour la requête « rejoindre / église en ligne ».
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.r },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <link rel="canonical" href={`${APP_URL}/rejoindre`} />
      <RejoindreContent />
    </>
  )
}

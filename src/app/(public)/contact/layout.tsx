import type { Metadata } from 'next'
import { ogImage } from '@/lib/og'

export const metadata: Metadata = {
  title: 'Contact & Bureaux Régionaux',
  description:
    'Contactez La Chapelle Internationale : Paris, Kinshasa, Abidjan, Montréal, Bruxelles. Formulaire de contact, délais de réponse, partenariats.',
  keywords: ['contact CIER', 'bureaux régionaux', 'partenariat', 'collaboration ministérielle'],
  openGraph: {
    title: 'Contact — CIER',
    description: 'Nos équipes vous répondent en 24-48h.',
    type: 'website',
    images: [ogImage({ eyebrow: 'Contact', title: 'Nos équipes vous répondent', subtitle: 'Paris · Kinshasa · Abidjan · Montréal · Bruxelles — réponse en 24-48h.' })],
  },
  alternates: { canonical: '/contact' },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

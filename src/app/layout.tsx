import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { Inter, Cinzel, Cormorant_Garamond, Poppins, DM_Sans } from 'next/font/google'
import '@/styles/globals.css'
import '@/styles/liquid-glass.css'
import { Toaster } from 'react-hot-toast'
import { LiquidGlassDefs } from '@/components/ui/LiquidGlass'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { MotionProvider } from '@/components/providers/MotionProvider'
import { DemoBanner } from '@/components/ui/DemoBanner'
import { AudioPlayerProvider } from '@/components/providers/AudioPlayerProvider'
import { AudioPlayerBar } from '@/components/ui/AudioPlayerBar'
import { WebVitalsReporter } from '@/components/providers/WebVitalsReporter'
import { AnalyticsTracker } from '@/components/providers/AnalyticsTracker'
import { SkipLink } from '@/components/ui/SkipLink'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  variable: '--font-poppins',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#050505',
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://citadelle.chapelleduroyaume.org'),
  title: {
    default: 'La Chapelle Internationale des Élus du Royaume — Une Église Ouverte au Monde',
    template: '%s | CIER',
  },
  description: 'Rejoignez la Chapelle Internationale des Élus du Royaume. Une église digitale mondiale francophone — cultes en direct, formations bibliques, communauté spirituelle, prière 24/7.',
  keywords: [
    'église en ligne', 'église chrétienne francophone', 'culte en direct',
    'formation biblique', 'chapelle internationale', 'église mondiale',
    'prière 24h', 'évangile', 'christian church online francophone',
    'église afrique diaspora',
  ],
  authors: [{ name: 'CIER — La Chapelle Internationale des Élus du Royaume' }],
  creator: 'CIER',
  publisher: 'La Chapelle Internationale des Élus du Royaume',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    siteName: 'CIER — La Chapelle Internationale des Élus du Royaume',
    title: 'La Chapelle Internationale des Élus du Royaume',
    description: 'Une Église Ouverte au Monde. Rejoignez des milliers de croyants dans une expérience spirituelle digitale unique.',
    images: [
      {
        url: '/api/og?title=Une%20%C3%89glise%20Ouverte%20au%20Monde&subtitle=Communaut%C3%A9%20chr%C3%A9tienne%20francophone%20mondiale',
        width: 1200,
        height: 630,
        alt: 'CIER — Une Église Ouverte au Monde',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CIER — La Chapelle Internationale des Élus du Royaume',
    description: 'Une Église Ouverte au Monde',
    images: ['/api/og?title=Une%20%C3%89glise%20Ouverte%20au%20Monde&subtitle=Communaut%C3%A9%20chr%C3%A9tienne%20francophone%20mondiale'],
    creator: '@cier_officiel',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Favicon & apple-touch-icon are auto-discovered from the static
  // src/app/icon.png and src/app/apple-icon.png (Next.js file convention) —
  // the official Chapelle gold "C" mark, no dynamic font generation.
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
    languages: {
      'fr-FR': '/',
      'en-US': '/en',
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${inter.variable} ${cinzel.variable} ${cormorant.variable} ${poppins.variable} ${dmSans.variable}`}
    >
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Church',
              name: 'La Chapelle Internationale des Élus du Royaume',
              alternateName: 'CIER',
              description: 'Une Église Ouverte au Monde — Communauté chrétienne francophone mondiale',
              slogan: 'Une Église Ouverte au Monde',
              foundingDate: '2018',
              knowsLanguage: ['fr', 'en'],
              url: process.env.NEXT_PUBLIC_APP_URL,
              logo: `${process.env.NEXT_PUBLIC_APP_URL}/icon-512.png`,
              sameAs: [
                'https://youtube.com/@cier',
                'https://facebook.com/cier',
                'https://instagram.com/cier',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'info@chapelleduroyaume.org',
                contactType: 'customer service',
                availableLanguage: ['French', 'English'],
              },
            }),
          }}
        />
        {/* WebSite — aide Google à reconnaître l'entité du site et son nom. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'CIER — La Chapelle Internationale des Élus du Royaume',
              alternateName: 'Citadelle',
              url: process.env.NEXT_PUBLIC_APP_URL,
              inLanguage: 'fr-FR',
              publisher: { '@type': 'Organization', name: 'La Chapelle Internationale des Élus du Royaume' },
            }),
          }}
        />
      </head>
      <body className="font-inter">
        <SkipLink />
        <WebVitalsReporter />
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <ThemeProvider>
          <MotionProvider>
          <QueryProvider>
            <AuthProvider>
              <AudioPlayerProvider>
              {children}
              <AudioPlayerBar />
              <DemoBanner />
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'rgba(10, 0, 21, 0.95)',
                    color: '#F5E6A7',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '14px',
                    padding: '12px 20px',
                  },
                  success: {
                    iconTheme: { primary: '#D4AF37', secondary: '#050505' },
                  },
                  error: {
                    iconTheme: { primary: '#EF4444', secondary: '#050505' },
                  },
                }}
              />
              </AudioPlayerProvider>
            </AuthProvider>
          </QueryProvider>
          </MotionProvider>
        </ThemeProvider>
        {/* Filtre de réfraction Liquid Glass — monté une seule fois pour tout le site. */}
        <LiquidGlassDefs scale={45} />
      </body>
    </html>
  )
}

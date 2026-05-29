import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

/**
 * Dynamic Open Graph image generator.
 *
 * Usage in metadata:
 *   openGraph: { images: [`/api/og?title=${encodeURIComponent(title)}`] }
 *
 * Query params:
 *   - title:    Main heading (default: CIER tagline)
 *   - eyebrow:  Small label above title (default: "La Chapelle Internationale")
 *   - subtitle: Optional descriptive line under title
 *
 * Returns a 1200×630 PNG with the cinematic dark royal palette so social cards
 * match the brand instead of falling back to a generic preview.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get('title') ?? 'Une Église Ouverte au Monde').slice(0, 110)
  const eyebrow = (searchParams.get('eyebrow') ?? 'La Chapelle Internationale').slice(0, 60)
  const subtitle = searchParams.get('subtitle')?.slice(0, 140)

  // Official Chapelle mark — served from /public so next/og embeds a real PNG
  // instead of trying (and failing) to fetch a dynamic font for a glyph.
  const logoSrc = new URL('/images/logo-mark.png', req.url).toString()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '70px 84px',
          background:
            'radial-gradient(1100px 700px at 80% -10%, rgba(75,0,130,0.35), transparent 60%),' +
            'radial-gradient(900px 600px at -10% 30%, rgba(212,175,55,0.18), transparent 60%),' +
            'radial-gradient(1100px 900px at 50% 110%, rgba(75,0,130,0.25), transparent 65%),' +
            'linear-gradient(180deg, #050307 0%, #0A0613 50%, #050308 100%)',
          color: '#F5E6D8',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              filter: 'drop-shadow(0 8px 28px rgba(212,175,55,0.45))',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={72} height={72} alt="CIER" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
                color: '#D4AF37',
              }}
            >
              CIER
            </div>
            <div style={{ fontSize: 14, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(245,230,216,0.45)' }}>
              Une Église Ouverte au Monde
            </div>
          </div>
        </div>

        {/* Title block */}
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 980 }}>
          <div
            style={{
              fontSize: 18,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: '#D4AF37',
              marginBottom: 24,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1.6,
              color: '#FFFFFF',
              textShadow: '0 2px 30px rgba(0,0,0,0.5)',
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 28,
                marginTop: 26,
                color: 'rgba(245,230,216,0.6)',
                lineHeight: 1.4,
                maxWidth: 920,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 18,
            color: 'rgba(245,230,216,0.45)',
            letterSpacing: 1,
          }}
        >
          <div>cier.org</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <span>120+ Nations</span>
            <span style={{ color: 'rgba(245,230,216,0.25)' }}>·</span>
            <span>127 000+ Membres</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}

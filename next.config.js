// Origine Supabase RÉELLE de l'app (dérivée de l'env) — à autoriser explicitement dans
// la CSP (connect/img/media). En prod = https://<ref>.supabase.co (déjà couvert par
// *.supabase.co) ; en LOCAL = http://127.0.0.1:55321 (sinon la CSP bloque toutes les
// lectures client + l'audio signé). Dérivé = zéro host en dur, valable quel que soit l'env.
const SUPA_ORIGIN = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').origin } catch { return '' }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build portable auto-suffisant pour PlanetHoster / N0C (Passenger, sans
  // build serveur) : génère .next/standalone avec un server.js + node_modules
  // minimal. Voir app.js (point d'entrée Passenger) et le dossier deploy-citadelle.
  output: 'standalone',
  reactStrictMode: true,
  // Passkeys/WebAuthn : @simplewebauthn/server est transpilé pour garantir un
  // bundle standalone portable (Passenger/PlanetHoster). Import serveur uniquement
  // (routes runtime='nodejs') — jamais dans le middleware Edge.
  transpilePackages: ['@simplewebauthn/server'],
  // Le type-checking TypeScript reste actif (sécurité). ESLint est désactivé
  // pendant le build : la résolution du plugin @typescript-eslint est instable
  // dans l'environnement de build portable (next/typescript). Lint en dev via
  // `npm run lint`.
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Hébergement Node mutualisé (PlanetHoster / N0C) : on désactive
    // l'optimisation serveur qui dépend du binaire natif `sharp` (compilé
    // par OS). Les images sont servies telles quelles (<img> classique),
    // ce qui rend le build « standalone » 100 % portable Windows → Linux.
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'chapelleduroyaume.org' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 86400,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline' *.youtube.com *.youtube-nocookie.com *.google.com js.chariowcdn.com;
              worker-src 'self' blob:;
              style-src 'self' 'unsafe-inline' fonts.googleapis.com js.chariowcdn.com;
              font-src 'self' fonts.gstatic.com;
              img-src 'self' data: blob: https: ${SUPA_ORIGIN};
              media-src 'self' blob: https: ${SUPA_ORIGIN};
              connect-src 'self' ${SUPA_ORIGIN} *.supabase.co wss: https: *.mychariow.shop js.chariowcdn.com;
              frame-src 'self' *.youtube.com *.youtube-nocookie.com *.vimeo.com *.mychariow.shop chapelleduroyaume.org;
            `.replace(/\s+/g, ' ').trim(),
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ]
  },
  // Transition post-lancement (10 août 2026) : la campagne d'ouverture est
  // terminée. La racine `/` sert de nouveau la vraie Home V3 (src/app/(public)/
  // page.tsx → HomeSections). Les pages de campagne restent accessibles sur
  // /ouverture et /ouverture/vision (URLs déjà diffusées publiquement).
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-icons'],
  },
  compiler: {
    // En prod on retire les console.* SAUF error/warn — indispensables pour
    // tracer les échecs serveur (emails, webhooks, RPC) dans les logs Passenger.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  poweredByHeader: false,
  compress: true,
  webpack: (config) => {
    // CITADELLE PDF-1 — pdf.js (pdfjs-dist) référence le module natif `canvas`
    // (Node) qui n'est JAMAIS utilisé côté navigateur (rendu client only). On
    // l'exclut du bundle pour éviter une résolution échouée au build standalone.
    config.resolve = config.resolve || {}
    config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false }
    return config
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build portable auto-suffisant pour PlanetHoster / N0C (Passenger, sans
  // build serveur) : génère .next/standalone avec un server.js + node_modules
  // minimal. Voir app.js (point d'entrée Passenger) et le dossier deploy-citadelle.
  output: 'standalone',
  reactStrictMode: true,
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
              script-src 'self' 'unsafe-eval' 'unsafe-inline' *.youtube.com *.google.com js.chariowcdn.com;
              style-src 'self' 'unsafe-inline' fonts.googleapis.com js.chariowcdn.com;
              font-src 'self' fonts.gstatic.com;
              img-src 'self' data: blob: https:;
              media-src 'self' blob: https:;
              connect-src 'self' *.supabase.co wss: https: *.mychariow.shop js.chariowcdn.com;
              frame-src 'self' *.youtube.com *.vimeo.com *.mychariow.shop chapelleduroyaume.org;
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
}

module.exports = nextConfig

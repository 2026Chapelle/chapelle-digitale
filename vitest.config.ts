import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Résout l'alias `@/` (cf. tsconfig.json) pour les tests des libs pures.
const src = fileURLToPath(new URL('./src', import.meta.url))
// Stub des marqueurs Next `server-only`/`client-only` : fournis par le bundler
// Next à la compilation mais absents sous vitest. Les modules serveur du hub SEO
// (connecteurs Google, auth service-account) restent ainsi testables.
const emptyModule = fileURLToPath(new URL('./test/stubs/empty-module.ts', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': src,
      'server-only': emptyModule,
      'client-only': emptyModule,
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Les libs testées sont PURES (sans I/O) : pas de setup global nécessaire.
    globals: false,
  },
})

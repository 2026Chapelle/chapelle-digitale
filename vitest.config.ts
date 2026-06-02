import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Résout l'alias `@/` (cf. tsconfig.json) pour les tests des libs pures.
const src = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '@': src },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // Les libs testées sont PURES (sans I/O) : pas de setup global nécessaire.
    globals: false,
  },
})

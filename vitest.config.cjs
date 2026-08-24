const path = require('node:path')

const root = __dirname

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      'server-only': path.resolve(root, 'test/stubs/empty-module.ts'),
      'client-only': path.resolve(root, 'test/stubs/empty-module.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    globals: false,
  },
}

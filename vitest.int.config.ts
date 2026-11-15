import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.int.test.ts'],
    setupFiles: ['tests/helpers/load-env.ts'],
    testTimeout: 30000,
  },
})

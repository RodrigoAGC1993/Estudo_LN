import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      '@domain': resolve(__dirname, 'src/domain'),
      '@content': resolve(__dirname, 'src/content'),
      '@engine': resolve(__dirname, 'src/engine'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@persistence': resolve(__dirname, 'src/persistence'),
      '@validation': resolve(__dirname, 'src/validation'),
      '@composition': resolve(__dirname, 'src/composition'),
      'react': resolve(__dirname, 'node_modules/preact/compat'),
      'react-dom': resolve(__dirname, 'node_modules/preact/compat'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    alias: {
      'react': resolve(__dirname, 'node_modules/preact/compat/'),
      'react-dom': resolve(__dirname, 'node_modules/preact/compat/'),
    },
    server: {
      deps: {
        inline: ['zustand'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.{test,spec}.{ts,tsx}', 'src/**/index.ts'],
    },
  },
})

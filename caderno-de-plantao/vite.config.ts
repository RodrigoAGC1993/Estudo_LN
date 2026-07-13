import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Estudo_LN/' : '/',
  plugins: [
    preact(),
  ],
  resolve: {
    alias: {
      '@domain': resolve(__dirname, 'src/domain'),
      '@content': resolve(__dirname, 'src/content'),
      '@engine': resolve(__dirname, 'src/engine'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@persistence': resolve(__dirname, 'src/persistence'),
      '@validation': resolve(__dirname, 'src/validation'),
      '@composition': resolve(__dirname, 'src/composition'),
    },
  },
}))

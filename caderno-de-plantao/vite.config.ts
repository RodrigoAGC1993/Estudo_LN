import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve } from 'node:path'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/Estudo_LN/' : '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /\.(?:png|svg|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-assets',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Caderno de Plantão',
        short_name: 'Caderno',
        description: 'Motor narrativo interativo — Caso 01: As Balas',
        theme_color: '#0F1115',
        background_color: '#0F1115',
        display: 'standalone',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
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

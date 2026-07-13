/**
 * Service Worker registration with update detection.
 * Uses vite-plugin-pwa's virtual:pwa-register module for Workbox integration.
 *
 * Strategies:
 * - Precache: index.html, JS/CSS bundles, case-01.json, fonts, manifest, icons
 * - Network-first for HTML (ensures fresh content when online)
 * - Cache-first for hashed static assets (immutable by content hash)
 *
 * Update flow:
 * 1. New SW detected via `onNeedRefresh`
 * 2. User prompted: "Nova versão disponível. Atualizar?"
 * 3. On confirm: `updateSW(true)` triggers skipWaiting + page reload
 *
 * @module composition/sw-registration
 */

import { registerSW } from 'virtual:pwa-register'

/**
 * Initializes service worker registration with update detection.
 * Call once during application bootstrap.
 */
export function initServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return
  }

  const updateSW = registerSW({
    onNeedRefresh() {
      const shouldUpdate = confirm('Nova versão disponível. Atualizar?')
      if (shouldUpdate) {
        updateSW(true)
      }
    },
    onOfflineReady() {
      console.log('[SW] App pronta para uso offline')
    },
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        console.log(`[SW] Registrado: ${swUrl}`)
      }
    },
    onRegisterError(error) {
      console.error('[SW] Erro no registro:', error)
    },
  })
}

/**
 * Multi-Tab Detection — ADR-15, Design §18.8
 *
 * Detects when the application is open in multiple browser tabs
 * and warns the user (non-blocking). Uses BroadcastChannel with
 * fallback to storage events for older browsers.
 *
 * Does NOT block the second tab — only shows an advisory warning.
 * Uses sessionId and updatedAt to identify the most recent update.
 */

const CHANNEL_NAME = 'cdp-multitab'
const STORAGE_KEY = 'cdp_multitab_signal'

/**
 * Initializes multi-tab detection.
 * Calls `onDuplicate` when another tab is detected.
 * Returns a cleanup function to stop detection.
 */
export function initMultiTabDetection(onDuplicate: () => void): () => void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME)

    // Announce this tab is active
    channel.postMessage({ type: 'TAB_ACTIVE', timestamp: Date.now() })

    // Listen for other tabs announcing themselves
    channel.onmessage = (event: MessageEvent) => {
      if (event.data?.type === 'TAB_ACTIVE') {
        onDuplicate()
      }
    }

    return () => channel.close()
  } catch {
    // Fallback: use storage events for environments without BroadcastChannel
    const handler = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        onDuplicate()
      }
    }

    window.addEventListener('storage', handler)

    // Signal presence to other tabs via localStorage
    localStorage.setItem(STORAGE_KEY, Date.now().toString())

    return () => window.removeEventListener('storage', handler)
  }
}

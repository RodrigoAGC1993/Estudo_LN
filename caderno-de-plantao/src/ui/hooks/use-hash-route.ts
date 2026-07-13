/**
 * Hash-based routing hook (ADR-07)
 * Routes: #/start, #/playing, #/history, #/ending, #/debriefing, #/error
 */

import { useEffect } from 'preact/hooks'
import { useGameStore } from '../store'

export type Route = 'start' | 'playing' | 'history' | 'ending' | 'debriefing' | 'error'

const VALID_ROUTES: ReadonlySet<string> = new Set<Route>([
  'start',
  'playing',
  'history',
  'ending',
  'debriefing',
  'error',
])

/** Parse the current hash into a valid Route. Defaults to 'start'. */
export function parseHash(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '')
  if (VALID_ROUTES.has(cleaned)) {
    return cleaned as Route
  }
  return 'start'
}

/** Navigate to a route by changing the hash. */
export function navigateTo(route: Route): void {
  window.location.hash = `#/${route}`
}

/**
 * Custom hook: syncs window.location.hash → Zustand store route.
 * Also sets the default hash if none is present.
 */
export function useHashRoute(): Route {
  const route = useGameStore((s) => s.route)
  const setRoute = useGameStore((s) => s.setRoute)

  useEffect(() => {
    // Set default hash if empty
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.location.hash = '#/start'
    }

    // Sync initial hash to store
    const initial = parseHash(window.location.hash)
    setRoute(initial)

    const handleHashChange = () => {
      const newRoute = parseHash(window.location.hash)
      setRoute(newRoute)
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setRoute])

  return route
}

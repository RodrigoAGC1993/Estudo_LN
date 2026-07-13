/**
 * SaveStatus — Discrete persistence status indicator.
 *
 * Small indicator that shows the current save state.
 * States: "Salvo ✓", "Salvando…", "Salvamento indisponível ⚠"
 * Uses debounced `aria-live="polite"` — announces only after 1s of stable state.
 * Non-intrusive: doesn't block gameplay.
 *
 * Reads `persistenceWarning` from Zustand store.
 *
 * Requirements: 3.7, 7.3, 8.4
 */

import { useEffect, useRef, useState } from 'preact/hooks'
import { useGameStore } from '../store'
import './SaveStatus.css'

export type SaveState = 'saving' | 'saved' | 'unavailable'

/** Debounce delay for aria-live announcements (ms) */
const ANNOUNCE_DEBOUNCE_MS = 1000

/** Time after which "Salvo" indicator fades out (ms) */
const FADE_AFTER_MS = 3000

export interface SaveStatusProps {
  /** Override for save state (for testing) */
  overrideState?: SaveState
}

export function SaveStatus({ overrideState }: SaveStatusProps = {}) {
  const persistenceWarning = useGameStore((s) => s.persistenceWarning)
  const isProcessing = useGameStore((s) => s.isProcessing)

  // Determine current state
  const currentState: SaveState = overrideState ?? deriveSaveState(persistenceWarning, isProcessing)

  // Debounced announcement for screen readers
  const [announcedText, setAnnouncedText] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fade-out tracking for "saved" state
  const [isHidden, setIsHidden] = useState(false)
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }

    // Debounce the announcement
    debounceRef.current = setTimeout(() => {
      setAnnouncedText(getLabel(currentState))
    }, ANNOUNCE_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [currentState])

  // Manage fade-out for "saved" state
  useEffect(() => {
    if (fadeRef.current !== null) {
      clearTimeout(fadeRef.current)
    }

    if (currentState === 'saved') {
      setIsHidden(false)
      fadeRef.current = setTimeout(() => {
        setIsHidden(true)
      }, FADE_AFTER_MS)
    } else {
      setIsHidden(false)
    }

    return () => {
      if (fadeRef.current !== null) {
        clearTimeout(fadeRef.current)
      }
    }
  }, [currentState])

  const label = getLabel(currentState)
  const stateClass = `save-status--${currentState}`
  const hiddenClass = isHidden ? ' save-status--hidden' : ''

  return (
    <div
      class={`save-status ${stateClass}${hiddenClass}`}
      aria-label="Status de salvamento"
    >
      <span aria-hidden="true">{label}</span>
      {/* Debounced live region for AT announcements */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        class="sr-only"
      >
        {announcedText}
      </span>
    </div>
  )
}

function deriveSaveState(
  persistenceWarning: string | null,
  isProcessing: boolean,
): SaveState {
  if (persistenceWarning !== null) {
    return 'unavailable'
  }
  if (isProcessing) {
    return 'saving'
  }
  return 'saved'
}

function getLabel(state: SaveState): string {
  switch (state) {
    case 'saving':
      return 'Salvando…'
    case 'saved':
      return 'Salvo ✓'
    case 'unavailable':
      return 'Salvamento indisponível ⚠'
  }
}

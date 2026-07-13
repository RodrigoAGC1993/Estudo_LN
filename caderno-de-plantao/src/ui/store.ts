/**
 * Zustand Store (ADR-16)
 * Bridges Engine events to reactive UI state.
 * The store is read-only for components; writes occur only via
 * handleEngineEvent (from subscription) or setters for UI-specific state.
 */

import { create } from 'zustand'
import type {
  NodePresentation,
  BeatPresentation,
  DebriefingScreenPresentation,
  EndingName,
  EngineEvent,
} from '@domain/index'
import type { Route } from './hooks/use-hash-route'
import type { ThemePreference, FontScale } from './theme'
import { applyTheme, loadThemePreference, saveThemePreference, applyFontScale, loadFontScale, saveFontScale } from './theme'

export interface GameStore {
  // Current route
  route: Route
  setRoute(route: Route): void

  // Current presentation (from Engine events)
  currentPresentation: NodePresentation | null

  // Debriefing (from DEBRIEFING_PRESENTED)
  debriefingPresentation: DebriefingScreenPresentation | null

  // Ending info (from ENDING_RESOLVED)
  endingName: EndingName | null

  // Beat to display (from CHOICE_CONFIRMED or CONTINUATION_COMPLETED)
  currentBeat: BeatPresentation | null

  // UI state
  isProcessing: boolean
  persistenceWarning: string | null
  contentError: string | null
  sessionInvalidated: string | null
  multiTabWarning: string | null
  setMultiTabWarning(warning: string | null): void

  // Theme
  theme: ThemePreference
  setTheme(theme: ThemePreference): void

  // Font scale
  fontScale: FontScale
  setFontScale(scale: FontScale): void

  // Engine event handler (called by the subscription)
  handleEngineEvent(event: EngineEvent): void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  route: 'start',
  currentPresentation: null,
  debriefingPresentation: null,
  endingName: null,
  currentBeat: null,
  isProcessing: false,
  persistenceWarning: null,
  contentError: null,
  sessionInvalidated: null,
  multiTabWarning: null,
  theme: loadThemePreference(),
  fontScale: loadFontScale(),

  setRoute(route: Route) {
    set({ route })
  },

  setMultiTabWarning(warning: string | null) {
    set({ multiTabWarning: warning })
  },

  setTheme(theme: ThemePreference) {
    applyTheme(theme)
    saveThemePreference(theme)
    set({ theme })
  },

  setFontScale(scale: FontScale) {
    applyFontScale(scale)
    saveFontScale(scale)
    set({ fontScale: scale })
  },

  handleEngineEvent(event: EngineEvent) {
    switch (event.type) {
      case 'CASE_STARTED':
        set({
          currentPresentation: event.presentation,
          currentBeat: null,
          isProcessing: false,
          endingName: null,
          debriefingPresentation: null,
          contentError: null,
          sessionInvalidated: null,
        })
        break

      case 'NODE_PRESENTED':
        set({
          currentPresentation: event.presentation,
          currentBeat: null,
        })
        break

      case 'CHOICE_CONFIRMATION_STARTED':
        set({ isProcessing: true })
        break

      case 'CHOICE_CONFIRMED':
        set({
          currentPresentation: event.presentation,
          currentBeat: event.beat ?? null,
          isProcessing: false,
        })
        break

      case 'CONTINUATION_COMPLETED':
        set({
          currentPresentation: event.presentation ?? get().currentPresentation,
          currentBeat: event.beat ?? null,
          isProcessing: false,
        })
        break

      case 'SESSION_RESTORED':
        set({
          currentPresentation: event.presentation,
          currentBeat: null,
          isProcessing: false,
          endingName: null,
          debriefingPresentation: null,
          contentError: null,
          sessionInvalidated: null,
        })
        break

      case 'ENDING_RESOLVED':
        set({ endingName: event.ending.endingName })
        break

      case 'DEBRIEFING_PRESENTED':
        set({ debriefingPresentation: event.debriefing })
        break

      case 'PERSISTENCE_WARNING':
        set({ persistenceWarning: event.message })
        break

      case 'CONTENT_ERROR':
        set({ contentError: event.error.message })
        break

      case 'SESSION_INVALIDATED':
        set({ sessionInvalidated: event.reason })
        break
    }
  },
}))

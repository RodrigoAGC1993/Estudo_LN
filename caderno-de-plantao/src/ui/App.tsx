/**
 * App Shell — Root component with hash-based route switching.
 * Design §16, §19, §20B (canonical layout)
 */

import { useEffect, useState, useCallback } from 'preact/hooks'
import { useHashRoute } from './hooks/use-hash-route'
import { useGameStore } from './store'
import { applyTheme, applyFontScale, subscribeToSystemThemeChanges } from './theme'
import { StartScreen, PlayingScreen, EndingScreen, DebriefingScreen, ErrorScreen } from './screens'
import { SaveStatus, PreferencesPanel, HistoryPanel } from './components'
import { handleStart, handleResume, handleRestart, handleContinueNarrative } from '@composition'
import type { HistoryPresentation } from '@domain/index'
import './App.css'

export function App() {
  const route = useHashRoute()
  const theme = useGameStore((s) => s.theme)
  const fontScale = useGameStore((s) => s.fontScale)
  const multiTabWarning = useGameStore((s) => s.multiTabWarning)

  const [historyOpen, setHistoryOpen] = useState(false)

  // Apply theme on mount and subscribe to system changes
  useEffect(() => {
    applyTheme(theme)
    const unsubscribe = subscribeToSystemThemeChanges(() => useGameStore.getState().theme)
    return unsubscribe
  }, [theme])

  // Apply font scale on mount and when it changes
  useEffect(() => {
    applyFontScale(fontScale)
  }, [fontScale])

  // Show game-related UI only during gameplay
  const showGameUI = route === 'playing' || route === 'ending' || route === 'debriefing'

  // Build a minimal history presentation for the HistoryPanel
  const historyPresentation: HistoryPresentation = useGameStore((s) => {
    return {
      entries: [],
      currentPosition: {
        nodeId: s.currentPresentation?.nodeId ?? '',
        title: s.currentPresentation?.presentationMetadata?.title ?? '',
        narrativeTime: '',
        status: 'in_progress' as const,
      },
    }
  })

  const toggleHistory = useCallback(() => setHistoryOpen((prev) => !prev), [])
  const closeHistory = useCallback(() => setHistoryOpen(false), [])

  return (
    <div class="app-shell">
      <header class="app-header" role="banner">
        <div class="app-header__left">
          <span class="app-header__icon" aria-hidden="true">📋</span>
          <div class="app-header__titles">
            <span class="app-header__title">Caderno de Plantão</span>
            <span class="app-header__subtitle">Caso 01 — As Balas</span>
          </div>
        </div>
        <div class="app-header__right">
          {showGameUI && (
            <button
              type="button"
              class="app-header__btn"
              onClick={toggleHistory}
              aria-expanded={historyOpen}
              aria-controls="history-panel"
              aria-label="Histórico"
            >
              Histórico
            </button>
          )}
          <PreferencesPanel />
        </div>
      </header>

      {multiTabWarning && (
        <div
          class="app-shell__multi-tab-warning"
          role="status"
          aria-live="polite"
        >
          <p>{multiTabWarning}</p>
          <button
            type="button"
            class="app-shell__multi-tab-dismiss"
            aria-label="Fechar aviso de aba duplicada"
            onClick={() => useGameStore.getState().setMultiTabWarning(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div class="app-shell__body">
        <main class="app-main" lang="pt-BR">
          {renderScreen(route)}
        </main>

        {showGameUI && (
          <aside class="app-sidebar" aria-label="Painel lateral">
            <HistoryPanel
              history={historyPresentation}
              isOpen={historyOpen}
              onClose={closeHistory}
              onToggle={toggleHistory}
            />
          </aside>
        )}
      </div>

      {showGameUI && (
        <footer class="app-footer" role="contentinfo">
          <SaveStatus />
          <span class="app-footer__a11y" aria-live="polite">
            Navegação por teclado ativa • Enter ou Espaço para selecionar
          </span>
          <span class="app-footer__font-size">
            Aa Tamanho da fonte: {getFontSizeLabel(fontScale)}
          </span>
        </footer>
      )}
    </div>
  )
}

function renderScreen(route: string) {
  switch (route) {
    case 'playing':
      return <PlayingScreen />
    case 'ending':
      return <EndingScreen onContinue={handleContinueNarrative} />
    case 'debriefing':
      return <DebriefingScreen onRestart={handleRestart} />
    case 'error':
      return <ErrorScreen />
    case 'start':
    default:
      return <StartScreen onStart={handleStart} onResume={handleResume} />
  }
}

function getFontSizeLabel(scale: number): string {
  if (scale <= 0.75) return 'Pequeno'
  if (scale <= 1) return 'Médio'
  if (scale <= 1.25) return 'Grande'
  return 'Extra grande'
}

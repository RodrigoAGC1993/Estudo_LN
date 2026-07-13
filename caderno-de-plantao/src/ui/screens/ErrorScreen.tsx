/**
 * ErrorScreen — Unrecoverable error display.
 *
 * Reads `contentError` or `sessionInvalidated` from Zustand store.
 * Shows a clear message and "Iniciar nova partida" button → navigates to #/start.
 * Uses `role="alert"` and `aria-live="assertive"` for critical errors.
 * Focus moves to the error heading on mount.
 *
 * Requirements: 3.7, 7.3, 8.4
 */

import { useEffect, useRef } from 'preact/hooks'
import { useGameStore } from '../store'
import { navigateTo } from '../hooks/use-hash-route'
import './ErrorScreen.css'

export function ErrorScreen() {
  const contentError = useGameStore((s) => s.contentError)
  const sessionInvalidated = useGameStore((s) => s.sessionInvalidated)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to heading on mount
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const handleRestart = () => {
    navigateTo('start')
  }

  const errorMessage = contentError ?? sessionInvalidated ?? 'Ocorreu um erro inesperado.'
  const heading = contentError
    ? 'Erro de conteúdo'
    : sessionInvalidated
      ? 'Sessão inválida'
      : 'Erro'

  return (
    <section class="error-screen" aria-label="Tela de erro">
      <div role="alert" aria-live="assertive" aria-atomic="true">
        <div class="error-screen__icon" aria-hidden="true">
          ⚠
        </div>
        <h1
          class="error-screen__heading"
          ref={headingRef}
          tabIndex={-1}
        >
          {heading}
        </h1>
        <p class="error-screen__message">{errorMessage}</p>
      </div>
      <div class="error-screen__actions">
        <button
          class="error-screen__btn"
          type="button"
          onClick={handleRestart}
          aria-label="Iniciar nova partida"
        >
          Iniciar nova partida
        </button>
      </div>
    </section>
  )
}

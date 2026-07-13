/**
 * StartScreen — Tela inicial e retomada de sessão.
 *
 * Responsabilities:
 * - Display case title "As Balas" and brief context
 * - Check save status via composition layer (no direct repository access)
 * - If save exists → show "Retomar partida" and "Nova partida" buttons
 * - If no save → show just "Iniciar" button
 * - If save is corrupted/incompatible → show warning + "Iniciar nova partida"
 * - Accessible: semantic buttons, keyboard navigable, proper heading hierarchy
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { useState, useEffect } from 'preact/hooks'
import { checkSaveStatus } from '@composition'
import type { SaveDetectionStatus } from '@composition'
import { useGameStore } from '../store'
import './StartScreen.css'

/** Save detection states (re-exported from composition for backward compat) */
export type SaveStatus = SaveDetectionStatus

export interface StartScreenProps {
  /** Called when user chooses to start a new game */
  onStart?: () => void
  /** Called when user chooses to resume an existing session */
  onResume?: () => void
}

export function StartScreen({ onStart, onResume }: StartScreenProps = {}) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'loading' })
  const sessionInvalidated = useGameStore((s) => s.sessionInvalidated)

  useEffect(() => {
    checkSaveStatus().then((status) => {
      // If the store signals session invalidation (e.g. from a failed restore attempt),
      // override with corrupted status
      if (sessionInvalidated && status.kind === 'none') {
        setSaveStatus({
          kind: 'corrupted',
          message: sessionInvalidated,
        })
      } else {
        setSaveStatus(status)
      }
    })
  }, [sessionInvalidated])

  return (
    <section class="start-screen" aria-label="Tela inicial">
      <h1 class="start-screen__title">As Balas</h1>
      <p class="start-screen__subtitle">Caderno de Plantão — Caso 01</p>
      <p class="start-screen__description">
        Uma experiência narrativa interativa sobre decisões clínicas, suas consequências invisíveis
        e o peso de cada escolha no plantão.
      </p>

      {renderActions(saveStatus, onStart, onResume)}
    </section>
  )
}

function renderActions(
  saveStatus: SaveStatus,
  onStart?: () => void,
  onResume?: () => void,
) {
  switch (saveStatus.kind) {
    case 'loading':
      return (
        <div class="start-screen__actions">
          <p class="start-screen__loading" aria-live="polite">
            Verificando sessão salva…
          </p>
        </div>
      )

    case 'none':
      return (
        <div class="start-screen__actions">
          <button
            class="start-screen__btn start-screen__btn--primary"
            type="button"
            onClick={onStart}
            aria-label="Iniciar nova partida"
          >
            Iniciar
          </button>
        </div>
      )

    case 'valid':
      return (
        <div class="start-screen__actions">
          <button
            class="start-screen__btn start-screen__btn--primary"
            type="button"
            onClick={onResume}
            aria-label="Retomar partida salva"
          >
            Retomar partida
          </button>
          <button
            class="start-screen__btn"
            type="button"
            onClick={onStart}
            aria-label="Iniciar nova partida descartando a sessão salva"
          >
            Nova partida
          </button>
        </div>
      )

    case 'incompatible':
      return (
        <div class="start-screen__actions">
          <div class="start-screen__warning" role="alert">
            {saveStatus.message} A sessão anterior será descartada.
          </div>
          <button
            class="start-screen__btn start-screen__btn--primary"
            type="button"
            onClick={onStart}
            aria-label="Iniciar nova partida"
          >
            Iniciar nova partida
          </button>
        </div>
      )

    case 'corrupted':
      return (
        <div class="start-screen__actions">
          <div class="start-screen__warning" role="alert">
            {saveStatus.message}
          </div>
          <button
            class="start-screen__btn start-screen__btn--primary"
            type="button"
            onClick={onStart}
            aria-label="Iniciar nova partida"
          >
            Iniciar nova partida
          </button>
        </div>
      )
  }
}

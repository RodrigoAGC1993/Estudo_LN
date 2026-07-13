/**
 * PlayingScreen — Main gameplay screen with canonical reading layout.
 * Design §3.3 (UI_READER), §16, §20B.3
 *
 * Central reading card with scene indicator, prose, choices, and footer.
 */

import { useCallback } from 'preact/hooks'
import { useGameStore } from '../store'
import { DecisionNode, ProgressionNode } from '../components'
import './PlayingScreen.css'

/**
 * Engine accessor — set during application bootstrap (composition root).
 * Returns null if engine is not yet bootstrapped.
 */
let engineAccessor: (() => {
  continueNarrative(nodeId: string): Promise<void>
  confirmChoice(nodeId: string, choiceId: string): Promise<void>
}) | null = null

/** Set the engine accessor during application bootstrap (composition root). */
export function setPlayingScreenEngine(accessor: typeof engineAccessor) {
  engineAccessor = accessor
}

export function PlayingScreen() {
  const currentPresentation = useGameStore((s) => s.currentPresentation)
  const currentBeat = useGameStore((s) => s.currentBeat)
  const isProcessing = useGameStore((s) => s.isProcessing)

  const handleContinue = useCallback(() => {
    if (!currentPresentation || isProcessing) return
    engineAccessor?.()?.continueNarrative(currentPresentation.nodeId)
  }, [currentPresentation, isProcessing])

  const handleConfirmChoice = useCallback(
    (choiceId: string) => {
      if (!currentPresentation || isProcessing) return
      engineAccessor?.()?.confirmChoice(currentPresentation.nodeId, choiceId)
    },
    [currentPresentation, isProcessing],
  )

  if (!currentPresentation) {
    return (
      <section aria-label="Narrativa em andamento">
        <p>Carregando…</p>
      </section>
    )
  }

  const sceneTitle = currentPresentation.presentationMetadata?.title ?? ''
  const narrativeTime = currentPresentation.presentationMetadata?.narrativeTime ?? ''

  return (
    <div class="reading-card">
      {/* Scene indicator */}
      <span class="scene-indicator" aria-label="Indicador de cena">
        {narrativeTime ? `${sceneTitle} • ${narrativeTime}` : sceneTitle}
      </span>

      {/* Main node content */}
      {renderNode(currentPresentation, currentBeat, isProcessing, handleContinue, handleConfirmChoice)}

      {/* Discrete footer */}
      <footer class="reading-footer">
        Caso: As Balas • Personagem: Jéssica Almeida
      </footer>
    </div>
  )
}

function renderNode(
  currentPresentation: NonNullable<ReturnType<typeof useGameStore.getState>['currentPresentation']>,
  currentBeat: ReturnType<typeof useGameStore.getState>['currentBeat'],
  isProcessing: boolean,
  handleContinue: () => void,
  handleConfirmChoice: (choiceId: string) => void,
) {
  switch (currentPresentation.nodeKind) {
    case 'progression':
      return (
        <ProgressionNode
          presentation={currentPresentation}
          beat={currentBeat}
          isProcessing={isProcessing}
          onContinue={handleContinue}
        />
      )

    case 'decision':
      return (
        <DecisionNode
          presentation={currentPresentation}
          beat={currentBeat}
          isProcessing={isProcessing}
          onConfirmChoice={handleConfirmChoice}
        />
      )

    case 'ending':
      return (
        <ProgressionNode
          presentation={currentPresentation}
          beat={currentBeat}
          isProcessing={isProcessing}
          onContinue={handleContinue}
        />
      )

    default:
      return (
        <section aria-label="Narrativa em andamento">
          <p>Nó desconhecido.</p>
        </section>
      )
  }
}

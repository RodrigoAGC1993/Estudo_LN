/**
 * DecisionNode — Componente de nó de decisão com confirmação em dois passos.
 * Design §20B.3, Requisitos 2.4–2.9, RC-1.1–RC-1.4
 *
 * UX de dois passos:
 * 1. Estado inicial: todas as escolhas como botões simples
 * 2. Jogador clica/toca uma escolha → destacada (selected)
 * 3. Exibe "Rever opções" (deselecionar) e "Confirmar decisão" (confirmar)
 * 4. "Confirmar decisão" chama onConfirmChoice(selectedChoiceId)
 * 5. Tudo desabilitado durante isProcessing
 *
 * Canonical layout: action heading "O que eu faço agora?" before choices.
 * Chevron › on right side is visual affordance only (doesn't skip confirmation).
 */

import { useState, useCallback, useRef, useEffect } from 'preact/hooks'
import type { NodePresentation, BeatPresentation } from '@domain/index'

export interface DecisionNodeProps {
  presentation: NodePresentation
  beat: BeatPresentation | null
  isProcessing: boolean
  onConfirmChoice: (choiceId: string) => void
}

export function DecisionNode({ presentation, beat, isProcessing, onConfirmChoice }: DecisionNodeProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [announced, setAnnounced] = useState(false)

  // Focus heading when node changes (new content)
  useEffect(() => {
    headingRef.current?.focus()
  }, [presentation.nodeId])

  // Reset selection when node changes
  useEffect(() => {
    setSelectedChoiceId(null)
    setAnnounced(false)
  }, [presentation.nodeId])

  const handleSelectChoice = useCallback(
    (choiceId: string) => {
      if (isProcessing) return
      setSelectedChoiceId(choiceId)
    },
    [isProcessing],
  )

  const handleReview = useCallback(() => {
    if (isProcessing) return
    setSelectedChoiceId(null)
  }, [isProcessing])

  const handleConfirm = useCallback(() => {
    if (isProcessing || !selectedChoiceId) return
    setAnnounced(true)
    onConfirmChoice(selectedChoiceId)
  }, [isProcessing, selectedChoiceId, onConfirmChoice])

  const title = presentation.presentationMetadata.title ?? presentation.nodeId

  return (
    <section
      class="decision-node"
      aria-labelledby="node-title"
      aria-busy={isProcessing}
    >
      <h2
        id="node-title"
        class="node-title"
        tabindex={-1}
        ref={headingRef}
      >
        {title}
      </h2>

      <article class="prose">
        {presentation.prose.split('\n').map((paragraph, i) => (
          <p key={`prose-${i}`}>{paragraph}</p>
        ))}
      </article>

      {beat && (
        <p class="beat-prose">{beat.prose}</p>
      )}

      <h3 class="action-heading">O que eu faço agora?</h3>

      <div class="choices" role="group" aria-label="Escolhas disponíveis">
        {presentation.options?.map((option) => {
          if (option.isContinuation) return null
          const isSelected = selectedChoiceId === option.id
          return (
            <button
              key={option.id}
              type="button"
              class={`choice-btn${isSelected ? ' choice-btn--selected' : ''}`}
              aria-pressed={isSelected}
              aria-label={option.accessibleLabel ?? option.label}
              disabled={isProcessing || (selectedChoiceId !== null && !isSelected)}
              onClick={() => handleSelectChoice(option.id)}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {selectedChoiceId !== null && (
        <div class="confirmation-actions" role="group" aria-label="Confirmar ou rever decisão">
          <button
            type="button"
            class="action-btn action-btn--review"
            disabled={isProcessing}
            onClick={handleReview}
          >
            Rever opções
          </button>
          <button
            type="button"
            class="action-btn action-btn--confirm"
            disabled={isProcessing}
            onClick={handleConfirm}
          >
            Confirmar decisão
          </button>
        </div>
      )}

      {/* aria-live region for confirmation announcement */}
      <div
        class="sr-announcement"
        aria-live="polite"
        aria-atomic="true"
      >
        {announced ? 'Decisão confirmada' : ''}
      </div>
    </section>
  )
}

/**
 * EndingScreen — Tela de desfecho (EndingNode).
 * Design §5.5, §9.8 passo B, Requisitos 5.1, 6.5, 12.6
 *
 * Reads `currentPresentation` from store (nodeKind === 'ending').
 * Renders the ending literary prose.
 * Shows "Ver debriefing" button (from presentation.options where isContinuation=true).
 * On click → calls onContinue() which triggers Engine's continueNarrative.
 * Focus moves to title on mount.
 */

import { useRef, useEffect, useCallback } from 'preact/hooks'
import { useGameStore } from '../store'
import './EndingScreen.css'

export interface EndingScreenProps {
  /** Called when the player clicks "Ver debriefing" */
  onContinue?: () => void
}

export function EndingScreen({ onContinue }: EndingScreenProps = {}) {
  const presentation = useGameStore((s) => s.currentPresentation)
  const isProcessing = useGameStore((s) => s.isProcessing)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to heading on mount
  useEffect(() => {
    headingRef.current?.focus()
  }, [presentation?.nodeId])

  const handleContinue = useCallback(() => {
    if (onContinue) {
      onContinue()
    }
  }, [onContinue])

  if (!presentation || presentation.nodeKind !== 'ending') {
    return (
      <section aria-label="Desfecho" class="ending-screen">
        <p class="ending-screen__loading">Carregando desfecho…</p>
      </section>
    )
  }

  const title = presentation.presentationMetadata.title ?? 'Desfecho'
  const continuationOption = presentation.options?.find((o) => o.isContinuation)

  return (
    <section class="ending-screen" aria-label="Desfecho">
      <h1
        class="ending-screen__title"
        tabindex={-1}
        ref={headingRef}
      >
        {title}
      </h1>

      <article class="ending-screen__prose">
        {presentation.prose.split('\n').map((paragraph, i) => (
          <p key={`ending-prose-${i}`}>{paragraph}</p>
        ))}
      </article>

      {continuationOption && (
        <div class="ending-screen__actions">
          <button
            type="button"
            class="ending-screen__btn ending-screen__btn--continue"
            disabled={isProcessing}
            onClick={handleContinue}
            aria-label={continuationOption.accessibleLabel ?? continuationOption.label}
          >
            {continuationOption.label}
          </button>
        </div>
      )}
    </section>
  )
}

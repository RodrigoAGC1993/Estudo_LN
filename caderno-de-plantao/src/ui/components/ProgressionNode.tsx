/**
 * ProgressionNode — Renders narrative progression nodes with continuation action.
 *
 * Displays prose content, optional beat narrative, and a "Continuar" button.
 * Respects prefers-reduced-motion, blocks controls during processing,
 * and moves focus to new heading after transition.
 *
 * Design §4.2 (ProgressionNode), §4.4 (ContinuationAction)
 * Requirements: 2.3, 2.8, 2.9, 10.7
 */

import { useEffect, useRef } from 'preact/hooks'
import type { NodePresentation, BeatPresentation } from '@domain/index'
import './ProgressionNode.css'

export interface ProgressionNodeProps {
  presentation: NodePresentation
  beat: BeatPresentation | null
  isProcessing: boolean
  onContinue: () => void
}

export function ProgressionNode({ presentation, beat, isProcessing, onContinue }: ProgressionNodeProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const prevNodeIdRef = useRef<string>(presentation.nodeId)

  // Move focus to heading when transitioning to a new node (Req 2.9)
  useEffect(() => {
    if (presentation.nodeId !== prevNodeIdRef.current) {
      prevNodeIdRef.current = presentation.nodeId
      // Wait a tick for DOM to settle, then focus
      requestAnimationFrame(() => {
        headingRef.current?.focus()
      })
    }
  }, [presentation.nodeId])

  const title = presentation.presentationMetadata?.title
  const continuationOption = presentation.options?.find((opt) => opt.isContinuation)
  const buttonLabel = continuationOption?.label ?? 'Continuar'
  const accessibleLabel = continuationOption?.accessibleLabel

  return (
    <article class="progression-node" aria-label="Nó de progressão narrativa">
      {title && (
        <h2 class="progression-node__title" tabIndex={-1} ref={headingRef}>
          {title}
        </h2>
      )}
      {!title && (
        // Hidden focusable heading for focus management when no title is present
        <h2 class="progression-node__title progression-node__title--sr-only" tabIndex={-1} ref={headingRef}>
          Narrativa
        </h2>
      )}

      <div class="progression-node__prose">
        {presentation.prose.split('\n').map((paragraph, i) => (
          <p key={`${presentation.nodeId}-p-${i}`}>{paragraph}</p>
        ))}
      </div>

      {beat && (
        <aside class="progression-node__beat" aria-label="Consequência interpessoal">
          {beat.prose.split('\n').map((paragraph, i) => (
            <p key={`${presentation.nodeId}-beat-${i}`}>{paragraph}</p>
          ))}
        </aside>
      )}

      <div class="progression-node__actions">
        <button
          type="button"
          class="progression-node__continue-btn"
          onClick={() => { if (!isProcessing) onContinue() }}
          disabled={isProcessing}
          aria-label={accessibleLabel ?? buttonLabel}
          aria-busy={isProcessing}
        >
          {isProcessing ? 'Processando…' : buttonLabel}
        </button>
      </div>
    </article>
  )
}

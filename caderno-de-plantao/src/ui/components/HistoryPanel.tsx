/**
 * HistoryPanel — Read-only chronological view of visited narrative scenes.
 *
 * Requirements: 9.6, RC-2.1, RC-2.2, RC-2.3, RC-2.4
 * Design §16 (canonical layout)
 *
 * Desktop (>768px): side column in sidebar, timeline with dots.
 * Mobile (<=768px): overlay modal with focus containment, Escape to close.
 *
 * Each item: "Cena N — {factual title}" + factual choice description OR "Não visitada".
 * Never shows future scenes, total count, or alternative endings (non-predictive history).
 *
 * Supports controlled mode (isOpen/onClose/onToggle from parent) for App shell integration.
 */

import { useState, useRef, useEffect, useCallback } from 'preact/hooks'
import type { HistoryPresentation } from '@domain/index'
import './HistoryPanel.css'

export interface HistoryPanelProps {
  history: HistoryPresentation
  /** Controlled open state */
  isOpen?: boolean
  /** Called to close the panel */
  onClose?: () => void
  /** Called to toggle the panel */
  onToggle?: () => void
}

/**
 * Breakpoint matching mobile overlay behavior (<=768px).
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export function HistoryPanel({ history, isOpen: controlledOpen, onClose, onToggle }: HistoryPanelProps) {
  // Support both controlled and uncontrolled mode
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const isMobile = useIsMobile()

  const close = useCallback(() => {
    if (onClose) {
      onClose()
    } else {
      setInternalOpen(false)
    }
    toggleRef.current?.focus()
  }, [onClose])

  const toggle = useCallback(() => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen((prev) => !prev)
    }
  }, [onToggle])

  // Focus the close button (mobile) or panel when opening
  useEffect(() => {
    if (isOpen) {
      if (isMobile && closeRef.current) {
        closeRef.current.focus()
      } else if (panelRef.current) {
        panelRef.current.focus()
      }
    }
  }, [isOpen, isMobile])

  // Escape key closes the panel
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  // Focus trap for mobile overlay
  useEffect(() => {
    if (!isOpen || !isMobile || !panelRef.current) return

    const panel = panelRef.current
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusableElements.length === 0) return

      const firstFocusable = focusableElements[0]!
      const lastFocusable = focusableElements[focusableElements.length - 1]!

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable.focus()
        }
      }
    }

    panel.addEventListener('keydown', handleFocusTrap)
    return () => panel.removeEventListener('keydown', handleFocusTrap)
  }, [isOpen, isMobile])

  // Determine panel ARIA attributes for mobile overlay
  const panelRoleProps = isMobile
    ? { role: 'dialog' as const, 'aria-modal': true as const }
    : {}

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        class="history-toggle-btn"
        aria-expanded={isOpen}
        aria-controls="history-panel"
        onClick={toggle}
      >
        <span class="history-toggle-btn__icon" aria-hidden="true">
          ☰
        </span>
        Histórico
      </button>

      <aside
        ref={panelRef}
        id="history-panel"
        class="history-panel"
        data-open={isOpen}
        tabIndex={-1}
        aria-label="Histórico da partida"
        {...panelRoleProps}
      >
        {/* Close button — visible only on mobile */}
        <button
          ref={closeRef}
          type="button"
          class="history-panel__close-btn"
          aria-label="Fechar histórico"
          onClick={close}
        >
          Fechar
        </button>

        <nav aria-label="Histórico da partida">
          <h2 class="history-panel__heading">Histórico</h2>

          {history.entries.length > 0 && (
            <ol class="history-panel__list">
              {history.entries.map((entry, idx) => (
                <li key={entry.nodeId} class="history-panel__entry history-panel__entry--visited">
                  <span class="history-panel__dot history-panel__dot--filled" aria-hidden="true" />
                  <div class="history-panel__entry-content">
                    <span class="history-panel__entry-scene" aria-hidden="true">Cena {idx + 1}</span>
                    {entry.title && (
                      <span class="history-panel__entry-title">{entry.title}</span>
                    )}
                    {entry.narrativeTime && (
                      <span class="history-panel__entry-time">{entry.narrativeTime}</span>
                    )}
                    {entry.choiceLabel && (
                      <span class="history-panel__entry-choice">{entry.choiceLabel}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* Current position indicator */}
          {history.currentPosition.nodeId && (
            <div class="history-panel__current" aria-live="polite">
              <span class="history-panel__dot history-panel__dot--current" aria-hidden="true" />
              <div class="history-panel__entry-content">
                <span class="history-panel__current-label">Cena em andamento</span>
                {history.currentPosition.title && (
                  <span class="history-panel__entry-title">
                    {' — '}
                    {history.currentPosition.title}
                  </span>
                )}
                {history.currentPosition.narrativeTime && (
                  <span class="history-panel__entry-time">
                    {history.currentPosition.narrativeTime}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Ending status */}
          <div class="history-panel__ending">
            <span class="history-panel__dot history-panel__dot--empty" aria-hidden="true" />
            <span class="history-panel__entry-title">Desfecho — Não alcançado</span>
          </div>
        </nav>
      </aside>
    </>
  )
}

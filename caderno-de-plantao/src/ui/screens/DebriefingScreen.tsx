/**
 * DebriefingScreen — Tela de debriefing causal pós-desfecho.
 * Design §4.6, §13.3, Requisitos 6.1–6.7, 12.6
 *
 * Reads `debriefingPresentation` from store.
 * Renders 6 structured sections in order:
 *   1. "Seu desfecho"
 *   2. "O que você percebeu"
 *   3. "Onde o risco aumentou"
 *   4. "O que protegeu o paciente"
 *   5. "O que levar para o próximo plantão"
 *   6. "Revisão clínica"
 *
 * Each section has a heading (<h2>) and list of entries.
 * If entry has `analysisCategory`, a subtle visual indicator (CSS class) is added
 * without revealing the internal name.
 * The clinical review section includes the disclaimer.
 * Action buttons: "Iniciar nova partida" and "Voltar ao início".
 *
 * Focus management: moves focus to <h1> on mount.
 * Semantic HTML: <section>, <article>, <h2> for section headings.
 */

import { useRef, useEffect, useCallback } from 'preact/hooks'
import { useGameStore } from '../store'
import { navigateTo } from '../hooks/use-hash-route'
import './DebriefingScreen.css'

/** Map of analysisCategory to a CSS class suffix (opaque to user). */
const CATEGORY_CLASS_MAP: Record<string, string> = {
  decisao_adequada: 'cat-1',
  decisao_defensavel_incompleta: 'cat-2',
  processo_inseguro_sem_dano: 'cat-3',
  atraso: 'cat-4',
  omissao: 'cat-5',
  fator_protetor: 'cat-6',
  fator_sistemico: 'cat-7',
  decisao_critica: 'cat-8',
}

/** Clinical review disclaimer text (Requisito 6.7) */
const CLINICAL_DISCLAIMER =
  'Esta revisão clínica é opcional e sujeita a validação profissional.'

/** Section title used to identify the clinical review section */
const CLINICAL_REVIEW_TITLE = 'Revisão clínica'

export interface DebriefingScreenProps {
  /** Called when player wants to start a new game */
  onRestart?: () => void
}

export function DebriefingScreen({ onRestart }: DebriefingScreenProps = {}) {
  const debriefing = useGameStore((s) => s.debriefingPresentation)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to heading on mount
  useEffect(() => {
    headingRef.current?.focus()
  }, [debriefing])

  const handleRestart = useCallback(() => {
    if (onRestart) {
      onRestart()
    }
  }, [onRestart])

  const handleBackToStart = useCallback(() => {
    navigateTo('start')
  }, [])

  if (!debriefing) {
    return (
      <section aria-label="Debriefing" class="debriefing-screen">
        <p class="debriefing-screen__loading">Carregando debriefing…</p>
      </section>
    )
  }

  return (
    <section class="debriefing-screen" aria-label="Debriefing">
      <h1
        class="debriefing-screen__title"
        tabindex={-1}
        ref={headingRef}
      >
        Seu plantão
      </h1>

      <div class="debriefing-screen__sections">
        {debriefing.sections.map((section, sectionIdx) => (
          <section
            key={`section-${sectionIdx}`}
            class="debriefing-section"
            aria-labelledby={`section-heading-${sectionIdx}`}
          >
            <h2
              id={`section-heading-${sectionIdx}`}
              class="debriefing-section__heading"
            >
              {section.title}
            </h2>

            {section.title === CLINICAL_REVIEW_TITLE && (
              <p class="debriefing-section__disclaimer">
                {CLINICAL_DISCLAIMER}
              </p>
            )}

            <ul class="debriefing-section__entries" role="list">
              {section.entries.map((entry, entryIdx) => {
                const categoryClass = entry.analysisCategory
                  ? CATEGORY_CLASS_MAP[entry.analysisCategory] ?? ''
                  : ''

                return (
                  <li
                    key={`entry-${sectionIdx}-${entryIdx}`}
                    class={`debriefing-entry${categoryClass ? ` debriefing-entry--${categoryClass}` : ''}`}
                  >
                    <p class="debriefing-entry__content">{entry.content}</p>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <div class="debriefing-screen__actions">
        <button
          type="button"
          class="debriefing-screen__btn debriefing-screen__btn--primary"
          onClick={handleRestart}
          aria-label="Iniciar nova partida"
        >
          Iniciar nova partida
        </button>
        <button
          type="button"
          class="debriefing-screen__btn"
          onClick={handleBackToStart}
          aria-label="Voltar ao início"
        >
          Voltar ao início
        </button>
      </div>
    </section>
  )
}

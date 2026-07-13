/**
 * DecisionNode — Unit tests for two-step confirmation UX.
 * Validates: Requirements 2.4, 2.5, 2.6, 2.8, 2.9, RC-1.1, RC-1.2, RC-1.3, RC-1.4
 */

import { render, fireEvent } from '@testing-library/preact'
import { describe, it, expect, vi } from 'vitest'
import { DecisionNode } from './DecisionNode'
import type { DecisionNodeProps } from './DecisionNode'
import type { NodePresentation, BeatPresentation } from '@domain/index'

function makePresentation(overrides?: Partial<NodePresentation>): NodePresentation {
  return {
    nodeId: 'node-1',
    prose: 'Você observa o monitor cardíaco.',
    presentationMetadata: { title: 'ECG Quente' },
    nodeKind: 'decision',
    options: [
      { id: 'choice-a', label: 'Chamar o plantonista', isContinuation: false },
      { id: 'choice-b', label: 'Aguardar mais um pouco', isContinuation: false },
      { id: 'choice-c', label: 'Verificar novamente', isContinuation: false },
    ],
    ...overrides,
  }
}

function renderDecisionNode(overrides?: Partial<DecisionNodeProps>) {
  const props: DecisionNodeProps = {
    presentation: makePresentation(),
    beat: null,
    isProcessing: false,
    onConfirmChoice: vi.fn(),
    ...overrides,
  }
  const result = render(<DecisionNode {...props} />)
  return { ...result, props }
}

function getChoiceButtons(container: Element): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll('.choice-btn')) as HTMLButtonElement[]
}

function getButtonByText(container: Element, text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button')) as HTMLButtonElement[]
  const match = buttons.find((b) => b.textContent?.includes(text))
  if (!match) throw new Error(`Button with text "${text}" not found`)
  return match
}

describe('DecisionNode', () => {
  describe('Rendering', () => {
    it('renders title as h2 with correct id and tabindex', () => {
      const { container } = renderDecisionNode()
      const heading = container.querySelector('h2#node-title')
      expect(heading).not.toBeNull()
      expect(heading!.textContent).toBe('ECG Quente')
      expect(heading!.getAttribute('tabindex')).toBe('-1')
    })

    it('renders prose text in an article element', () => {
      const { container } = renderDecisionNode()
      const article = container.querySelector('article.prose')
      expect(article).not.toBeNull()
      expect(article!.textContent).toContain('Você observa o monitor cardíaco.')
    })

    it('renders all choice buttons', () => {
      const { container } = renderDecisionNode()
      const buttons = getChoiceButtons(container)
      expect(buttons).toHaveLength(3)
      expect(buttons[0]!.textContent).toBe('Chamar o plantonista')
      expect(buttons[1]!.textContent).toBe('Aguardar mais um pouco')
      expect(buttons[2]!.textContent).toBe('Verificar novamente')
    })

    it('renders beat prose when provided', () => {
      const beat: BeatPresentation = { prose: 'A enfermeira olha com desconfiança.' }
      const { container } = renderDecisionNode({ beat })
      const beatEl = container.querySelector('.beat-prose')
      expect(beatEl).not.toBeNull()
      expect(beatEl!.textContent).toContain('A enfermeira olha com desconfiança.')
    })

    it('does not render beat prose when beat is null', () => {
      const { container } = renderDecisionNode({ beat: null })
      const beatEl = container.querySelector('.beat-prose')
      expect(beatEl).toBeNull()
    })
  })

  describe('Two-step confirmation', () => {
    it('step 1: all choices are initially enabled and not selected', () => {
      const { container } = renderDecisionNode()
      const buttons = getChoiceButtons(container)
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(false)
        expect(btn.getAttribute('aria-pressed')).toBe('false')
      })
    })

    it('step 2: clicking a choice highlights it and shows confirmation actions', () => {
      const { container } = renderDecisionNode()
      const choiceA = getButtonByText(container, 'Chamar o plantonista')
      fireEvent.click(choiceA)

      // Selected choice is highlighted
      expect(choiceA.getAttribute('aria-pressed')).toBe('true')
      expect(choiceA.className).toContain('choice-btn--selected')

      // Confirmation buttons appear
      const confirmBtn = getButtonByText(container, 'Confirmar decisão')
      const reviewBtn = getButtonByText(container, 'Rever opções')
      expect(confirmBtn).not.toBeNull()
      expect(reviewBtn).not.toBeNull()
    })

    it('step 2: non-selected choices are disabled after selection', () => {
      const { container } = renderDecisionNode()
      fireEvent.click(getButtonByText(container, 'Chamar o plantonista'))

      const choiceB = getButtonByText(container, 'Aguardar mais um pouco')
      const choiceC = getButtonByText(container, 'Verificar novamente')
      expect(choiceB.disabled).toBe(true)
      expect(choiceC.disabled).toBe(true)
    })

    it('"Rever opções" deselects and shows all choices again', () => {
      const { container } = renderDecisionNode()
      fireEvent.click(getButtonByText(container, 'Chamar o plantonista'))
      fireEvent.click(getButtonByText(container, 'Rever opções'))

      const buttons = getChoiceButtons(container)
      expect(buttons).toHaveLength(3)
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(false)
        expect(btn.getAttribute('aria-pressed')).toBe('false')
      })
    })

    it('"Confirmar decisão" calls onConfirmChoice with selected choice id', () => {
      const { container, props } = renderDecisionNode()
      fireEvent.click(getButtonByText(container, 'Aguardar mais um pouco'))
      fireEvent.click(getButtonByText(container, 'Confirmar decisão'))

      expect(props.onConfirmChoice).toHaveBeenCalledWith('choice-b')
      expect(props.onConfirmChoice).toHaveBeenCalledTimes(1)
    })
  })

  describe('Processing state (blocks controls)', () => {
    it('disables all choice buttons when isProcessing', () => {
      const { container } = renderDecisionNode({ isProcessing: true })
      const buttons = getChoiceButtons(container)
      buttons.forEach((btn) => {
        expect(btn.disabled).toBe(true)
      })
    })

    it('disables confirmation buttons when isProcessing', () => {
      const presentation = makePresentation()
      const onConfirmChoice = vi.fn()

      const { container, rerender } = render(
        <DecisionNode
          presentation={presentation}
          beat={null}
          isProcessing={false}
          onConfirmChoice={onConfirmChoice}
        />,
      )

      // Select a choice first
      fireEvent.click(getButtonByText(container, 'Chamar o plantonista'))

      // Now set processing
      rerender(
        <DecisionNode
          presentation={presentation}
          beat={null}
          isProcessing={true}
          onConfirmChoice={onConfirmChoice}
        />,
      )

      const reviewBtn = getButtonByText(container, 'Rever opções')
      const confirmBtn = getButtonByText(container, 'Confirmar decisão')
      expect(reviewBtn.disabled).toBe(true)
      expect(confirmBtn.disabled).toBe(true)
    })

    it('sets aria-busy on container when isProcessing', () => {
      const { container } = renderDecisionNode({ isProcessing: true })
      const section = container.querySelector('.decision-node')
      expect(section!.getAttribute('aria-busy')).toBe('true')
    })

    it('does not call onConfirmChoice when clicking during processing', () => {
      const presentation = makePresentation()
      const onConfirmChoice = vi.fn()

      const { container, rerender } = render(
        <DecisionNode
          presentation={presentation}
          beat={null}
          isProcessing={false}
          onConfirmChoice={onConfirmChoice}
        />,
      )

      // Select a choice
      fireEvent.click(getButtonByText(container, 'Chamar o plantonista'))

      // Set processing
      rerender(
        <DecisionNode
          presentation={presentation}
          beat={null}
          isProcessing={true}
          onConfirmChoice={onConfirmChoice}
        />,
      )

      // Try to click confirm — should not fire
      const confirmBtn = getButtonByText(container, 'Confirmar decisão')
      fireEvent.click(confirmBtn)
      expect(onConfirmChoice).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('wraps content in section with aria-labelledby="node-title"', () => {
      const { container } = renderDecisionNode()
      const section = container.querySelector('section[aria-labelledby="node-title"]')
      expect(section).not.toBeNull()
    })

    it('choice buttons have aria-pressed attribute', () => {
      const { container } = renderDecisionNode()
      const buttons = getChoiceButtons(container)
      buttons.forEach((btn) => {
        expect(btn.getAttribute('aria-pressed')).not.toBeNull()
      })
    })

    it('announces "Decisão confirmada" via aria-live after confirmation', () => {
      const { container } = renderDecisionNode()
      fireEvent.click(getButtonByText(container, 'Chamar o plantonista'))
      fireEvent.click(getButtonByText(container, 'Confirmar decisão'))

      const liveRegion = container.querySelector('[aria-live="polite"]')
      expect(liveRegion!.textContent).toBe('Decisão confirmada')
    })

    it('heading has tabindex="-1" for programmatic focus', () => {
      const { container } = renderDecisionNode()
      const heading = container.querySelector('h2#node-title')
      expect(heading!.getAttribute('tabindex')).toBe('-1')
    })

    it('uses accessible labels from options when available', () => {
      const presentation = makePresentation({
        options: [
          { id: 'c1', label: 'Opção curta', accessibleLabel: 'Opção com mais contexto para leitores de tela', isContinuation: false },
        ],
      })
      const { container } = renderDecisionNode({ presentation })
      const btn = getChoiceButtons(container)[0]!
      expect(btn.getAttribute('aria-label')).toBe('Opção com mais contexto para leitores de tela')
    })

    it('choices group has role="group" with aria-label', () => {
      const { container } = renderDecisionNode()
      const group = container.querySelector('[role="group"][aria-label="Escolhas disponíveis"]')
      expect(group).not.toBeNull()
    })
  })

  describe('Node transition', () => {
    it('resets selection when node changes', () => {
      const onConfirmChoice = vi.fn()
      const { container, rerender } = render(
        <DecisionNode
          presentation={makePresentation()}
          beat={null}
          isProcessing={false}
          onConfirmChoice={onConfirmChoice}
        />,
      )

      // Select a choice
      fireEvent.click(getButtonByText(container, 'Chamar o plantonista'))
      expect(getButtonByText(container, 'Confirmar decisão')).not.toBeNull()

      // Change to a different node
      rerender(
        <DecisionNode
          presentation={makePresentation({ nodeId: 'node-2' })}
          beat={null}
          isProcessing={false}
          onConfirmChoice={onConfirmChoice}
        />,
      )

      // Selection is reset — no confirmation buttons visible
      const buttons = getChoiceButtons(container)
      buttons.forEach((btn) => {
        expect(btn.getAttribute('aria-pressed')).toBe('false')
      })
      // Confirmation actions should be gone
      const confirmBtns = Array.from(container.querySelectorAll('.confirmation-actions'))
      expect(confirmBtns).toHaveLength(0)
    })
  })
})

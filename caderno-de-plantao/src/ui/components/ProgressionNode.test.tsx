/**
 * Tests for ProgressionNode component.
 * Requirements: 2.3, 2.8, 2.9, 10.7
 */

import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/preact'
import { ProgressionNode } from './ProgressionNode'
import type { NodePresentation, BeatPresentation } from '@domain/index'

function makePresentation(overrides?: Partial<NodePresentation>): NodePresentation {
  return {
    nodeId: 'test-node-1',
    prose: 'Você caminha pelo corredor silencioso.',
    presentationMetadata: { title: 'O Corredor' },
    options: [{ id: 'continue', label: 'Continuar', accessibleLabel: 'Avançar para próxima cena', isContinuation: true }],
    nodeKind: 'progression',
    ...overrides,
  }
}

describe('ProgressionNode', () => {
  it('renders prose content as paragraphs', () => {
    const presentation = makePresentation({ prose: 'Primeira linha.\nSegunda linha.' })
    const { container } = render(
      <ProgressionNode presentation={presentation} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const paragraphs = container.querySelectorAll('.progression-node__prose p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]!.textContent).toBe('Primeira linha.')
    expect(paragraphs[1]!.textContent).toBe('Segunda linha.')
  })

  it('renders title as h2 with tabindex=-1', () => {
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const heading = container.querySelector('h2.progression-node__title')
    expect(heading).not.toBeNull()
    expect(heading!.textContent).toBe('O Corredor')
    expect(heading!.getAttribute('tabindex')).toBe('-1')
  })

  it('renders a sr-only heading when no title is provided', () => {
    const presentation = makePresentation({
      presentationMetadata: {},
    })
    const { container } = render(
      <ProgressionNode presentation={presentation} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const heading = container.querySelector('h2.progression-node__title--sr-only')
    expect(heading).not.toBeNull()
    expect(heading!.textContent).toBe('Narrativa')
  })

  it('renders "Continuar" button with accessible label', () => {
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const btn = container.querySelector('.progression-node__continue-btn') as HTMLButtonElement
    expect(btn).not.toBeNull()
    expect(btn.textContent).toBe('Continuar')
    expect(btn.getAttribute('aria-label')).toBe('Avançar para próxima cena')
    expect(btn.disabled).toBe(false)
  })

  it('calls onContinue when button is clicked', () => {
    const onContinue = vi.fn()
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={null} isProcessing={false} onContinue={onContinue} />,
    )

    const btn = container.querySelector('.progression-node__continue-btn')!
    fireEvent.click(btn)
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('disables button when isProcessing is true (blocks controls during transition)', () => {
    const onContinue = vi.fn()
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={null} isProcessing={true} onContinue={onContinue} />,
    )

    const btn = container.querySelector('.progression-node__continue-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.textContent).toBe('Processando…')

    fireEvent.click(btn)
    expect(onContinue).not.toHaveBeenCalled()
  })

  it('renders beat as additional narrative prose when provided', () => {
    const beat: BeatPresentation = { prose: 'A enfermeira acena brevemente.' }
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={beat} isProcessing={false} onContinue={() => {}} />,
    )

    const aside = container.querySelector('.progression-node__beat')
    expect(aside).not.toBeNull()
    expect(aside!.getAttribute('aria-label')).toBe('Consequência interpessoal')
    expect(aside!.textContent).toContain('A enfermeira acena brevemente.')
  })

  it('does not render beat section when beat is null', () => {
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const aside = container.querySelector('.progression-node__beat')
    expect(aside).toBeNull()
  })

  it('uses default "Continuar" label when no options are provided', () => {
    const { options: _, ...rest } = makePresentation()
    const presentation: NodePresentation = { ...rest }
    const { container } = render(
      <ProgressionNode presentation={presentation} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const btn = container.querySelector('.progression-node__continue-btn')!
    expect(btn.textContent).toBe('Continuar')
    expect(btn.getAttribute('aria-label')).toBe('Continuar')
  })

  it('renders article with aria-label for accessibility', () => {
    const { container } = render(
      <ProgressionNode presentation={makePresentation()} beat={null} isProcessing={false} onContinue={() => {}} />,
    )

    const article = container.querySelector('article.progression-node')
    expect(article).not.toBeNull()
    expect(article!.getAttribute('aria-label')).toBe('Nó de progressão narrativa')
  })
})

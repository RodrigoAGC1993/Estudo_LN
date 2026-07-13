/**
 * HistoryPanel — Unit Tests
 * Validates accessibility, desktop/mobile behavior, and content rendering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/preact'
import { HistoryPanel } from './HistoryPanel'
import type { HistoryPresentation } from '@domain/index'

function createHistory(overrides?: Partial<HistoryPresentation>): HistoryPresentation {
  return {
    entries: [
      {
        nodeId: 'node-1',
        title: 'Início do Plantão',
        narrativeTime: '22:00',
        choiceLabel: 'Verificar prontuário',
        sequence: 1,
      },
      {
        nodeId: 'node-2',
        title: 'Enfermaria',
        narrativeTime: '22:30',
        sequence: 2,
      },
    ],
    currentPosition: {
      nodeId: 'node-3',
      title: 'UTI',
      narrativeTime: '23:00',
      status: 'in_progress',
    },
    ...overrides,
  }
}

/** Helper to get the toggle button specifically (has aria-controls) */
function getToggleBtn() {
  return document.querySelector<HTMLButtonElement>('button[aria-controls="history-panel"]')!
}

describe('HistoryPanel', () => {
  beforeEach(() => {
    // Reset matchMedia to desktop by default
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1024 })
  })

  describe('Toggle button', () => {
    it('renders toggle button with "Histórico" text', () => {
      render(<HistoryPanel history={createHistory()} />)
      const btn = getToggleBtn()
      expect(btn).toBeDefined()
      expect(btn.textContent).toContain('Histórico')
    })

    it('toggle button has aria-expanded=false by default (collapsed)', () => {
      render(<HistoryPanel history={createHistory()} />)
      const btn = getToggleBtn()
      expect(btn.getAttribute('aria-expanded')).toBe('false')
    })

    it('toggle button has aria-expanded=true when panel is open', async () => {
      render(<HistoryPanel history={createHistory()} />)
      const btn = getToggleBtn()
      await fireEvent.click(btn)
      expect(btn.getAttribute('aria-expanded')).toBe('true')
    })

    it('aria-controls points to the panel id', () => {
      render(<HistoryPanel history={createHistory()} />)
      const btn = getToggleBtn()
      expect(btn.getAttribute('aria-controls')).toBe('history-panel')
    })
  })

  describe('Panel content', () => {
    it('panel is hidden by default', () => {
      render(<HistoryPanel history={createHistory()} />)
      const panel = document.getElementById('history-panel')
      expect(panel?.getAttribute('data-open')).toBe('false')
    })

    it('renders heading "Histórico" inside nav', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())
      const heading = screen.getByRole('heading', { name: /histórico/i })
      expect(heading).toBeDefined()
    })

    it('renders nav with aria-label "Histórico da partida"', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())
      const nav = screen.getByRole('navigation', { name: /histórico da partida/i })
      expect(nav).toBeDefined()
    })

    it('renders ordered list of visited entries', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())
      const items = screen.getAllByRole('listitem')
      expect(items.length).toBe(2)
    })

    it('renders entry title, narrativeTime, and choice label', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      expect(screen.getByText('Início do Plantão')).toBeDefined()
      expect(screen.getByText('22:00')).toBeDefined()
      expect(screen.getByText(/Verificar prontuário/)).toBeDefined()
    })

    it('shows "Cena em andamento" for current position', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      expect(screen.getByText('Cena em andamento')).toBeDefined()
    })

    it('shows current position title and time when available', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      expect(screen.getByText(/UTI/)).toBeDefined()
      expect(screen.getByText('23:00')).toBeDefined()
    })

    it('renders empty list when no entries exist', async () => {
      const history = createHistory({ entries: [] })
      render(<HistoryPanel history={history} />)
      await fireEvent.click(getToggleBtn())

      const list = document.querySelector('.history-panel__list')
      expect(list).toBeNull()
    })

    it('never renders future scenes or total count', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      // Only entries from history.entries + current position are shown
      // No total count, no nodes beyond what's provided
      const panel = document.getElementById('history-panel')
      expect(panel?.textContent).not.toContain('total')
      expect(panel?.textContent).not.toContain('alternativ')
    })
  })

  describe('Keyboard interaction', () => {
    it('Escape key closes the panel', async () => {
      render(<HistoryPanel history={createHistory()} />)
      const btn = getToggleBtn()
      await fireEvent.click(btn)

      expect(btn.getAttribute('aria-expanded')).toBe('true')

      await fireEvent.keyDown(document, { key: 'Escape' })

      expect(btn.getAttribute('aria-expanded')).toBe('false')
    })

    it('returns focus to toggle button on close', async () => {
      render(<HistoryPanel history={createHistory()} />)
      const btn = getToggleBtn()
      await fireEvent.click(btn)
      await fireEvent.keyDown(document, { key: 'Escape' })

      expect(document.activeElement).toBe(btn)
    })
  })

  describe('Mobile overlay', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 })
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
    })

    it('panel has role="dialog" and aria-modal on mobile', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      const panel = document.getElementById('history-panel')
      expect(panel?.getAttribute('role')).toBe('dialog')
      expect(panel?.getAttribute('aria-modal')).toBe('true')
    })

    it('shows close button with aria-label "Fechar histórico"', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      const closeBtn = screen.getByRole('button', { name: /fechar histórico/i })
      expect(closeBtn).toBeDefined()
    })

    it('close button closes the panel and returns focus', async () => {
      render(<HistoryPanel history={createHistory()} />)
      const toggleBtn = getToggleBtn()
      await fireEvent.click(toggleBtn)

      const closeBtn = screen.getByRole('button', { name: /fechar histórico/i })
      await fireEvent.click(closeBtn)

      expect(toggleBtn.getAttribute('aria-expanded')).toBe('false')
      expect(document.activeElement).toBe(toggleBtn)
    })
  })

  describe('Desktop side panel', () => {
    it('does not have role="dialog" on desktop', async () => {
      render(<HistoryPanel history={createHistory()} />)
      await fireEvent.click(getToggleBtn())

      const panel = document.getElementById('history-panel')
      expect(panel?.getAttribute('role')).toBeNull()
    })
  })
})

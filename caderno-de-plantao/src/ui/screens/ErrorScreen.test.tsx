import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/preact'
import { ErrorScreen } from './ErrorScreen'
import { useGameStore } from '../store'

// Mock navigateTo
vi.mock('../hooks/use-hash-route', () => ({
  navigateTo: vi.fn(),
  useHashRoute: vi.fn().mockReturnValue('error'),
  parseHash: vi.fn(),
}))

describe('ErrorScreen', () => {
  beforeEach(() => {
    useGameStore.setState({
      contentError: null,
      sessionInvalidated: null,
    })
  })

  it('renders with role="alert" for accessibility', () => {
    useGameStore.setState({ contentError: 'Erro de teste' })
    render(<ErrorScreen />)

    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('uses aria-live="assertive" on the alert container', () => {
    useGameStore.setState({ contentError: 'Erro de conteúdo' })
    render(<ErrorScreen />)

    const alertEl = screen.getByRole('alert')
    expect(alertEl.getAttribute('aria-live')).toBe('assertive')
  })

  it('displays content error heading and message', () => {
    useGameStore.setState({ contentError: 'Nenhuma regra de desfecho satisfeita' })
    render(<ErrorScreen />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Erro de conteúdo')
    expect(screen.getByText('Nenhuma regra de desfecho satisfeita')).toBeDefined()
  })

  it('displays session invalidated heading and message', () => {
    useGameStore.setState({
      sessionInvalidated: 'A versão do caso mudou. Sessão descartada.',
    })
    render(<ErrorScreen />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Sessão inválida')
    expect(screen.getByText('A versão do caso mudou. Sessão descartada.')).toBeDefined()
  })

  it('displays fallback message when no specific error is set', () => {
    render(<ErrorScreen />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Erro')
    expect(screen.getByText('Ocorreu um erro inesperado.')).toBeDefined()
  })

  it('shows "Iniciar nova partida" button', () => {
    useGameStore.setState({ contentError: 'Erro' })
    render(<ErrorScreen />)

    const btn = screen.getByRole('button', { name: /iniciar nova partida/i })
    expect(btn).toBeDefined()
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.getAttribute('type')).toBe('button')
  })

  it('navigates to start on button click', async () => {
    const { navigateTo } = await import('../hooks/use-hash-route')
    useGameStore.setState({ contentError: 'Erro' })
    render(<ErrorScreen />)

    const btn = screen.getByRole('button', { name: /iniciar nova partida/i })
    btn.click()

    expect(navigateTo).toHaveBeenCalledWith('start')
  })

  it('moves focus to heading on mount', () => {
    useGameStore.setState({ contentError: 'Erro' })
    render(<ErrorScreen />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.getAttribute('tabindex')).toBe('-1')
    // The heading should be the focused element after mount
    expect(document.activeElement).toBe(heading)
  })

  it('prioritizes contentError over sessionInvalidated', () => {
    useGameStore.setState({
      contentError: 'Nenhuma regra de desfecho satisfeita',
      sessionInvalidated: 'Sessão incompatível descartada',
    })
    render(<ErrorScreen />)

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Erro de conteúdo')
    expect(screen.getByText('Nenhuma regra de desfecho satisfeita')).toBeDefined()
  })
})

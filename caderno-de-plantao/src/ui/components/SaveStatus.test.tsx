import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/preact'
import { SaveStatus } from './SaveStatus'
import { useGameStore } from '../store'

describe('SaveStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useGameStore.setState({
      persistenceWarning: null,
      isProcessing: false,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with aria-label for accessibility', () => {
    render(<SaveStatus />)
    const container = document.querySelector('.save-status')
    expect(container?.getAttribute('aria-label')).toBe('Status de salvamento')
  })

  it('shows "Salvo ✓" when no persistence warning and not processing', () => {
    render(<SaveStatus />)
    expect(screen.getByText('Salvo ✓')).toBeDefined()
  })

  it('shows "Salvando…" when isProcessing is true', () => {
    useGameStore.setState({ isProcessing: true })
    render(<SaveStatus />)
    expect(screen.getByText('Salvando…')).toBeDefined()
  })

  it('shows "Salvamento indisponível ⚠" when persistenceWarning is set', () => {
    useGameStore.setState({ persistenceWarning: 'localStorage indisponível' })
    render(<SaveStatus />)
    expect(screen.getByText('Salvamento indisponível ⚠')).toBeDefined()
  })

  it('applies unavailable class when persistence is unavailable', () => {
    useGameStore.setState({ persistenceWarning: 'erro' })
    render(<SaveStatus />)
    const container = document.querySelector('.save-status')
    expect(container?.classList.contains('save-status--unavailable')).toBe(true)
  })

  it('applies saving class when processing', () => {
    useGameStore.setState({ isProcessing: true })
    render(<SaveStatus />)
    const container = document.querySelector('.save-status')
    expect(container?.classList.contains('save-status--saving')).toBe(true)
  })

  it('applies saved class when idle', () => {
    render(<SaveStatus />)
    const container = document.querySelector('.save-status')
    expect(container?.classList.contains('save-status--saved')).toBe(true)
  })

  it('has an aria-live="polite" region for debounced screen reader announcements', () => {
    render(<SaveStatus />)
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).not.toBeNull()
    expect(liveRegion?.getAttribute('role')).toBe('status')
  })

  it('debounces the aria-live announcement by 1 second', () => {
    render(<SaveStatus />)
    const liveRegion = document.querySelector('[aria-live="polite"]')

    // Initially empty (hasn't debounced yet)
    expect(liveRegion?.textContent).toBe('')

    // After 1s debounce, it should announce
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(liveRegion?.textContent).toBe('Salvo ✓')
  })

  it('fades out after 3 seconds in saved state', () => {
    render(<SaveStatus />)
    const container = document.querySelector('.save-status')

    // Initially visible
    expect(container?.classList.contains('save-status--hidden')).toBe(false)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(container?.classList.contains('save-status--hidden')).toBe(true)
  })

  it('does not fade out in unavailable state', () => {
    useGameStore.setState({ persistenceWarning: 'erro' })
    render(<SaveStatus />)
    const container = document.querySelector('.save-status')

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(container?.classList.contains('save-status--hidden')).toBe(false)
  })

  it('accepts overrideState prop for testing', () => {
    render(<SaveStatus overrideState="unavailable" />)
    expect(screen.getByText('Salvamento indisponível ⚠')).toBeDefined()
  })

  it('persistenceWarning takes priority over isProcessing', () => {
    useGameStore.setState({
      persistenceWarning: 'quota exceeded',
      isProcessing: true,
    })
    render(<SaveStatus />)
    expect(screen.getByText('Salvamento indisponível ⚠')).toBeDefined()
  })
})

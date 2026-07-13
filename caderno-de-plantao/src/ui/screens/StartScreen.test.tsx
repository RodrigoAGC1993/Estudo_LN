import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/preact'
import { StartScreen } from './StartScreen'
import { useGameStore } from '../store'

// Mock the persistence layer
vi.mock('@persistence/local-storage-repository', () => {
  const mockRepository = {
    isAvailable: vi.fn().mockReturnValue(true),
    loadActiveSession: vi.fn().mockResolvedValue(null),
    deleteActiveSession: vi.fn().mockResolvedValue(undefined),
    saveActiveSession: vi.fn().mockResolvedValue(undefined),
    loadLastCompletion: vi.fn().mockResolvedValue(null),
    saveLastCompletion: vi.fn().mockResolvedValue(undefined),
    deleteLastCompletion: vi.fn().mockResolvedValue(undefined),
  }
  return {
    LocalStorageSessionRepository: vi.fn().mockImplementation(() => mockRepository),
    __mockRepository: mockRepository,
  }
})

// Access the mock for control in tests
async function getMockRepository() {
  const mod = await import('@persistence/local-storage-repository')
  return (mod as unknown as { __mockRepository: ReturnType<typeof createMockRepo> }).__mockRepository
}

function createMockRepo() {
  return {
    isAvailable: vi.fn().mockReturnValue(true),
    loadActiveSession: vi.fn().mockResolvedValue(null),
    deleteActiveSession: vi.fn().mockResolvedValue(undefined),
    saveActiveSession: vi.fn().mockResolvedValue(undefined),
    loadLastCompletion: vi.fn().mockResolvedValue(null),
    saveLastCompletion: vi.fn().mockResolvedValue(undefined),
    deleteLastCompletion: vi.fn().mockResolvedValue(undefined),
  }
}

describe('StartScreen', () => {
  beforeEach(() => {
    // Reset store
    useGameStore.setState({
      sessionInvalidated: null,
    })
  })

  it('renders the case title as h1', async () => {
    render(<StartScreen />)

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeDefined()
    expect(heading.textContent).toBe('As Balas')
  })

  it('renders case subtitle', async () => {
    render(<StartScreen />)

    expect(screen.getByText('Caderno de Plantão — Caso 01')).toBeDefined()
  })

  it('shows loading state initially', () => {
    render(<StartScreen />)

    expect(screen.getByText('Verificando sessão salva…')).toBeDefined()
  })

  it('shows "Iniciar" button when no save exists', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue(null)

    render(<StartScreen />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar nova partida/i })).toBeDefined()
    })
  })

  it('shows "Retomar partida" and "Nova partida" when valid save exists', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue({
      schemaVersion: '1.0.0',
      caseId: 'caso-01-as-balas',
      caseVersion: '1.0.0',
      sessionId: 'test-session',
      currentNodeId: 'cena-1-ecg-quente',
      states: {},
      confirmedChoices: [],
      visitedNodes: ['cena-1-ecg-quente'],
      sessionStatus: 'in_progress',
      updatedAt: '2024-01-01T00:00:00Z',
    })

    render(<StartScreen />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retomar partida salva/i })).toBeDefined()
      expect(screen.getByRole('button', { name: /iniciar nova partida/i })).toBeDefined()
    })
  })

  it('shows incompatible save warning when schema version differs', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue({
      schemaVersion: '0.5.0',
      caseId: 'caso-01-as-balas',
      caseVersion: '1.0.0',
      sessionId: 'test-session',
      currentNodeId: 'cena-1-ecg-quente',
      states: {},
      confirmedChoices: [],
      visitedNodes: ['cena-1-ecg-quente'],
      sessionStatus: 'in_progress',
      updatedAt: '2024-01-01T00:00:00Z',
    })

    render(<StartScreen />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByRole('alert').textContent).toContain('versão anterior do sistema')
      expect(screen.getByRole('button', { name: /iniciar nova partida/i })).toBeDefined()
    })
  })

  it('shows incompatible save warning when case version differs', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue({
      schemaVersion: '1.0.0',
      caseId: 'caso-01-as-balas',
      caseVersion: '0.9.0',
      sessionId: 'test-session',
      currentNodeId: 'cena-1-ecg-quente',
      states: {},
      confirmedChoices: [],
      visitedNodes: ['cena-1-ecg-quente'],
      sessionStatus: 'in_progress',
      updatedAt: '2024-01-01T00:00:00Z',
    })

    render(<StartScreen />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByRole('alert').textContent).toContain('versão anterior do caso')
    })
  })

  it('shows corrupted save message from store sessionInvalidated', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue(null)

    useGameStore.setState({
      sessionInvalidated: 'A sessão salva está corrompida e não pode ser restaurada.',
    })

    render(<StartScreen />)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined()
      expect(screen.getByRole('alert').textContent).toContain('corrompida')
      expect(screen.getByRole('button', { name: /iniciar nova partida/i })).toBeDefined()
    })
  })

  it('calls onStart when "Iniciar" button is clicked', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue(null)

    const onStart = vi.fn()
    render(<StartScreen onStart={onStart} />)

    await waitFor(() => {
      screen.getByRole('button', { name: /iniciar nova partida/i })
    })

    screen.getByRole('button', { name: /iniciar nova partida/i }).click()
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('calls onResume when "Retomar partida" button is clicked', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue({
      schemaVersion: '1.0.0',
      caseId: 'caso-01-as-balas',
      caseVersion: '1.0.0',
      sessionId: 'test-session',
      currentNodeId: 'cena-1-ecg-quente',
      states: {},
      confirmedChoices: [],
      visitedNodes: ['cena-1-ecg-quente'],
      sessionStatus: 'in_progress',
      updatedAt: '2024-01-01T00:00:00Z',
    })

    const onResume = vi.fn()
    render(<StartScreen onResume={onResume} />)

    await waitFor(() => {
      screen.getByRole('button', { name: /retomar partida salva/i })
    })

    screen.getByRole('button', { name: /retomar partida salva/i }).click()
    expect(onResume).toHaveBeenCalledOnce()
  })

  it('all buttons are semantic button elements', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.loadActiveSession.mockResolvedValue({
      schemaVersion: '1.0.0',
      caseId: 'caso-01-as-balas',
      caseVersion: '1.0.0',
      sessionId: 'test-session',
      currentNodeId: 'cena-1-ecg-quente',
      states: {},
      confirmedChoices: [],
      visitedNodes: ['cena-1-ecg-quente'],
      sessionStatus: 'in_progress',
      updatedAt: '2024-01-01T00:00:00Z',
    })

    render(<StartScreen />)

    await waitFor(() => {
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(2)
      buttons.forEach((btn) => {
        expect(btn.tagName).toBe('BUTTON')
        expect(btn.getAttribute('type')).toBe('button')
      })
    })
  })

  it('shows "Iniciar" when storage is unavailable', async () => {
    const mockRepo = await getMockRepository()
    mockRepo.isAvailable.mockReturnValue(false)

    render(<StartScreen />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar nova partida/i })).toBeDefined()
    })

    // Restore for other tests
    mockRepo.isAvailable.mockReturnValue(true)
  })
})

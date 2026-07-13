import { describe, it, expect, vi } from 'vitest'
import { EngineCore } from './engine-core'
import type { SessionRepository, EngineEvent } from '@domain/index'

function createMockRepository(available = true): SessionRepository {
  return {
    saveActiveSession: vi.fn().mockResolvedValue(undefined),
    loadActiveSession: vi.fn().mockResolvedValue(null),
    deleteActiveSession: vi.fn().mockResolvedValue(undefined),
    saveLastCompletion: vi.fn().mockResolvedValue(undefined),
    loadLastCompletion: vi.fn().mockResolvedValue(null),
    deleteLastCompletion: vi.fn().mockResolvedValue(undefined),
    isAvailable: () => available,
  }
}

describe('EngineCore', () => {
  describe('command queue', () => {
    it('processes commands sequentially (one at a time)', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      // We can't call the real mutating methods (they throw "not implemented"),
      // so we verify queue behavior by timing multiple commands.
      // Let's verify that commands issued concurrently reject in order.
      const results: Array<{ index: number; settled: 'resolved' | 'rejected' }> = []

      const p1 = engine
        .startCase(null as never)
        .then(() => results.push({ index: 1, settled: 'resolved' }))
        .catch(() => results.push({ index: 1, settled: 'rejected' }))

      const p2 = engine
        .restartCase()
        .then(() => results.push({ index: 2, settled: 'resolved' }))
        .catch(() => results.push({ index: 2, settled: 'rejected' }))

      const p3 = engine
        .continueNarrative('node-1')
        .then(() => results.push({ index: 3, settled: 'resolved' }))
        .catch(() => results.push({ index: 3, settled: 'rejected' }))

      await Promise.allSettled([p1, p2, p3])

      // All should have rejected (not implemented), but in FIFO order
      expect(results).toHaveLength(3)
      expect(results[0]!.index).toBe(1)
      expect(results[1]!.index).toBe(2)
      expect(results[2]!.index).toBe(3)
    })

    it('does not process new commands after dispose', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      engine.dispose()

      // After dispose, commands should resolve silently (no-op)
      await expect(engine.startCase(null as never)).resolves.toBeUndefined()
    })

    it('processes commands in FIFO order even when enqueued simultaneously', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const order: string[] = []

      // Access the private enqueue via the public API — commands throw "not implemented"
      // but the ordering is deterministic
      const promises = [
        engine.startCase(null as never).catch(() => order.push('startCase')),
        engine.confirmChoice('n1', 'c1').catch(() => order.push('confirmChoice')),
        engine.continueNarrative('n2').catch(() => order.push('continueNarrative')),
      ]

      await Promise.allSettled(promises)

      expect(order).toEqual(['startCase', 'confirmChoice', 'continueNarrative'])
    })
  })

  describe('subscribe / unsubscribe', () => {
    it('subscribe returns an unsubscribe function', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener = vi.fn()

      const unsubscribe = engine.subscribe(listener)

      expect(typeof unsubscribe).toBe('function')
    })

    it('listener receives emitted events', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener = vi.fn()

      engine.subscribe(listener)

      // Use a cast to access the protected emit for testing
      const core = engine as unknown as { emit: (event: EngineEvent) => void }
      core.emit({ type: 'PERSISTENCE_WARNING', message: 'test warning' })

      expect(listener).toHaveBeenCalledOnce()
      expect(listener).toHaveBeenCalledWith({
        type: 'PERSISTENCE_WARNING',
        message: 'test warning',
      })
    })

    it('unsubscribe prevents further event delivery', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener = vi.fn()

      const unsubscribe = engine.subscribe(listener)
      unsubscribe()

      const core = engine as unknown as { emit: (event: EngineEvent) => void }
      core.emit({ type: 'PERSISTENCE_WARNING', message: 'should not arrive' })

      expect(listener).not.toHaveBeenCalled()
    })

    it('multiple listeners all receive events', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      engine.subscribe(listener1)
      engine.subscribe(listener2)

      const core = engine as unknown as { emit: (event: EngineEvent) => void }
      core.emit({ type: 'PERSISTENCE_WARNING', message: 'broadcast' })

      expect(listener1).toHaveBeenCalledOnce()
      expect(listener2).toHaveBeenCalledOnce()
    })

    it('subscribe after dispose returns no-op unsubscribe', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener = vi.fn()

      engine.dispose()

      const unsubscribe = engine.subscribe(listener)
      expect(typeof unsubscribe).toBe('function')

      // Should not throw
      unsubscribe()
    })
  })

  describe('dispose', () => {
    it('prevents further event emission', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener = vi.fn()

      engine.subscribe(listener)
      engine.dispose()

      const core = engine as unknown as { emit: (event: EngineEvent) => void }
      core.emit({ type: 'PERSISTENCE_WARNING', message: 'after dispose' })

      expect(listener).not.toHaveBeenCalled()
    })

    it('clears all listeners', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      engine.subscribe(listener1)
      engine.subscribe(listener2)
      engine.dispose()

      const core = engine as unknown as { emit: (event: EngineEvent) => void }
      core.emit({ type: 'PERSISTENCE_WARNING', message: 'gone' })

      expect(listener1).not.toHaveBeenCalled()
      expect(listener2).not.toHaveBeenCalled()
    })

    it('drains the command queue', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      // Enqueue some commands then dispose immediately
      void engine.startCase(null as never).catch(() => {})
      void engine.restartCase().catch(() => {})

      engine.dispose()

      // After dispose, queue should be empty and new commands are no-ops
      const core = engine as unknown as { commandQueue: unknown[] }
      expect(core.commandQueue).toHaveLength(0)
    })
  })

  describe('persistenceStatus', () => {
    it('starts as available when repository is available', () => {
      const repo = createMockRepository(true)
      const engine = new EngineCore(repo)

      const core = engine as unknown as { persistenceStatus: string }
      expect(core.persistenceStatus).toBe('available')
    })

    it('starts as degraded when repository is unavailable', () => {
      const repo = createMockRepository(false)
      const engine = new EngineCore(repo)

      const core = engine as unknown as { persistenceStatus: string }
      expect(core.persistenceStatus).toBe('degraded')
    })
  })

  describe('synchronous reads', () => {
    it('getHistoryPresentation returns empty entries initially', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      const history = engine.getHistoryPresentation()
      expect(history.entries).toEqual([])
      expect(history.currentPosition.status).toBe('in_progress')
    })

    it('getCurrentPresentation returns stub initially', () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      const presentation = engine.getCurrentPresentation()
      expect(presentation.nodeId).toBe('')
      expect(presentation.prose).toBe('')
      expect(presentation.nodeKind).toBe('progression')
    })
  })

  describe('stub methods throw not implemented', () => {
    it('startCase throws when given invalid input', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      // null caseFile causes a runtime error (no longer "not implemented")
      await expect(engine.startCase(null as never)).rejects.toThrow()
    })

    it('confirmChoice throws when session is not in progress', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      // Without starting a case, session is idle → InvalidCommandError
      await expect(engine.confirmChoice('n1', 'c1')).rejects.toThrow(
        'Sessão não está em progresso',
      )
    })

    it('continueNarrative throws when session is not in progress', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      await expect(engine.continueNarrative('n1')).rejects.toThrow(
        'Sessão não está em progresso',
      )
    })

    it('restoreSession throws IncompatibleSaveError on null inputs', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      await expect(engine.restoreSession(null as never, null as never)).rejects.toThrow()
    })

    it('restartCase throws when no case is loaded', async () => {
      const repo = createMockRepository()
      const engine = new EngineCore(repo)

      await expect(engine.restartCase()).rejects.toThrow('Nenhum caso carregado para reiniciar')
    })
  })
})

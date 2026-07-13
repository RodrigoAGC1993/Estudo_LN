import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LocalStorageSessionRepository } from './local-storage-repository'
import type { ActiveSessionSnapshot, LastCompletionRecord } from '@domain'
import { PersistenceError } from '@domain'

function makeSnapshot(overrides: Partial<ActiveSessionSnapshot> = {}): ActiveSessionSnapshot {
  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-01',
    caseVersion: '1.0.0',
    sessionId: 'session-abc',
    currentNodeId: 'cena-1-ecg-quente',
    states: { tempo_atrasado: 0, voltaren_comunicado: false },
    confirmedChoices: [],
    visitedNodes: ['cena-1-ecg-quente'],
    sessionStatus: 'in_progress',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeCompletionRecord(
  overrides: Partial<LastCompletionRecord> = {},
): LastCompletionRecord {
  return {
    schemaVersion: '1.0.0',
    caseId: 'caso-01',
    caseVersion: '1.0.0',
    endingId: 'ending-bom',
    completedAt: '2024-01-01T01:00:00.000Z',
    ...overrides,
  }
}

describe('LocalStorageSessionRepository', () => {
  let repo: LocalStorageSessionRepository

  beforeEach(() => {
    localStorage.clear()
    repo = new LocalStorageSessionRepository()
  })

  describe('saveActiveSession / loadActiveSession', () => {
    it('should save and load a session round-trip', async () => {
      const snapshot = makeSnapshot()
      await repo.saveActiveSession(snapshot)
      const loaded = await repo.loadActiveSession('caso-01')
      expect(loaded).toEqual(snapshot)
    })

    it('should return null when no session exists', async () => {
      const loaded = await repo.loadActiveSession('nonexistent')
      expect(loaded).toBeNull()
    })

    it('should return null and discard corrupted JSON', async () => {
      localStorage.setItem('cdp_session_caso-01', 'not valid json {{{')
      const loaded = await repo.loadActiveSession('caso-01')
      expect(loaded).toBeNull()
      expect(localStorage.getItem('cdp_session_caso-01')).toBeNull()
    })

    it('should return null and discard when required fields are missing', async () => {
      const partial = { schemaVersion: '1.0.0', caseId: 'caso-01' }
      localStorage.setItem('cdp_session_caso-01', JSON.stringify(partial))
      const loaded = await repo.loadActiveSession('caso-01')
      expect(loaded).toBeNull()
      expect(localStorage.getItem('cdp_session_caso-01')).toBeNull()
    })

    it('should return null when sessionStatus is invalid', async () => {
      const invalid = makeSnapshot()
      ;(invalid as unknown as Record<string, unknown>).sessionStatus = 'unknown'
      localStorage.setItem('cdp_session_caso-01', JSON.stringify(invalid))
      const loaded = await repo.loadActiveSession('caso-01')
      expect(loaded).toBeNull()
    })

    it('should throw PersistenceError on QuotaExceededError', async () => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        const err = new DOMException('Quota exceeded', 'QuotaExceededError')
        throw err
      })

      try {
        await expect(repo.saveActiveSession(makeSnapshot())).rejects.toThrow(PersistenceError)
        await expect(repo.saveActiveSession(makeSnapshot())).rejects.toThrow(
          /Armazenamento local cheio/,
        )
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('deleteActiveSession', () => {
    it('should remove the session key', async () => {
      await repo.saveActiveSession(makeSnapshot())
      expect(localStorage.getItem('cdp_session_caso-01')).not.toBeNull()
      await repo.deleteActiveSession('caso-01')
      expect(localStorage.getItem('cdp_session_caso-01')).toBeNull()
    })

    it('should not throw when key does not exist', async () => {
      await expect(repo.deleteActiveSession('nonexistent')).resolves.toBeUndefined()
    })
  })

  describe('saveLastCompletion / loadLastCompletion', () => {
    it('should save and load a completion record round-trip', async () => {
      const record = makeCompletionRecord()
      await repo.saveLastCompletion(record)
      const loaded = await repo.loadLastCompletion('caso-01')
      expect(loaded).toEqual(record)
    })

    it('should return null when no completion exists', async () => {
      const loaded = await repo.loadLastCompletion('nonexistent')
      expect(loaded).toBeNull()
    })

    it('should return null and discard corrupted JSON', async () => {
      localStorage.setItem('cdp_completion_caso-01', '<<<broken>>>')
      const loaded = await repo.loadLastCompletion('caso-01')
      expect(loaded).toBeNull()
      expect(localStorage.getItem('cdp_completion_caso-01')).toBeNull()
    })

    it('should return null and discard when required fields are missing', async () => {
      const partial = { schemaVersion: '1.0.0', endingId: 'ending-bom' }
      localStorage.setItem('cdp_completion_caso-01', JSON.stringify(partial))
      const loaded = await repo.loadLastCompletion('caso-01')
      expect(loaded).toBeNull()
      expect(localStorage.getItem('cdp_completion_caso-01')).toBeNull()
    })

    it('should throw PersistenceError on QuotaExceededError', async () => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        const err = new DOMException('Quota exceeded', 'QuotaExceededError')
        throw err
      })

      try {
        await expect(repo.saveLastCompletion(makeCompletionRecord())).rejects.toThrow(
          PersistenceError,
        )
        await expect(repo.saveLastCompletion(makeCompletionRecord())).rejects.toThrow(
          /Armazenamento local cheio/,
        )
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })

  describe('deleteLastCompletion', () => {
    it('should remove the completion key', async () => {
      await repo.saveLastCompletion(makeCompletionRecord())
      expect(localStorage.getItem('cdp_completion_caso-01')).not.toBeNull()
      await repo.deleteLastCompletion('caso-01')
      expect(localStorage.getItem('cdp_completion_caso-01')).toBeNull()
    })
  })

  describe('isAvailable', () => {
    it('should return true when localStorage works', () => {
      expect(repo.isAvailable()).toBe(true)
    })

    it('should return false when localStorage throws', () => {
      const original = Storage.prototype.setItem
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage disabled')
      })

      try {
        expect(repo.isAvailable()).toBe(false)
      } finally {
        Storage.prototype.setItem = original
      }
    })
  })
})

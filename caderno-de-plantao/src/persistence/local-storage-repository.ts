/**
 * Persistence — localStorage adapter for SessionRepository.
 * Implements save/load/delete for active sessions and last completion records.
 * Handles corruption detection, QuotaExceededError, and availability checks.
 *
 * Keys:
 *   - `cdp_session_{caseId}` — active session snapshot
 *   - `cdp_completion_{caseId}` — last completion record
 */

import type { ActiveSessionSnapshot, LastCompletionRecord, SessionRepository } from '@domain'
import { PersistenceError } from '@domain'

const SESSION_KEY_PREFIX = 'cdp_session_'
const COMPLETION_KEY_PREFIX = 'cdp_completion_'

function sessionKey(caseId: string): string {
  return `${SESSION_KEY_PREFIX}${caseId}`
}

function completionKey(caseId: string): string {
  return `${COMPLETION_KEY_PREFIX}${caseId}`
}

/**
 * Required fields for a valid ActiveSessionSnapshot.
 * Used for corruption detection on read.
 */
const REQUIRED_SESSION_FIELDS: (keyof ActiveSessionSnapshot)[] = [
  'schemaVersion',
  'caseId',
  'caseVersion',
  'sessionId',
  'currentNodeId',
  'states',
  'confirmedChoices',
  'visitedNodes',
  'sessionStatus',
  'updatedAt',
]

/**
 * Required fields for a valid LastCompletionRecord.
 * Used for corruption detection on read.
 */
const REQUIRED_COMPLETION_FIELDS: (keyof LastCompletionRecord)[] = [
  'schemaVersion',
  'caseId',
  'caseVersion',
  'endingId',
  'completedAt',
]

/**
 * Validates that a parsed object has all required fields for an ActiveSessionSnapshot.
 * Returns true if the object passes basic structural validation.
 */
function isValidSessionSnapshot(data: unknown): data is ActiveSessionSnapshot {
  if (data === null || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  for (const field of REQUIRED_SESSION_FIELDS) {
    if (!(field in obj)) return false
  }

  // Additional type checks for critical fields
  if (typeof obj.schemaVersion !== 'string') return false
  if (typeof obj.caseId !== 'string') return false
  if (typeof obj.caseVersion !== 'string') return false
  if (typeof obj.sessionId !== 'string') return false
  if (typeof obj.currentNodeId !== 'string') return false
  if (typeof obj.states !== 'object' || obj.states === null) return false
  if (!Array.isArray(obj.confirmedChoices)) return false
  if (!Array.isArray(obj.visitedNodes)) return false
  if (obj.sessionStatus !== 'in_progress' && obj.sessionStatus !== 'completed') return false
  if (typeof obj.updatedAt !== 'string') return false

  return true
}

/**
 * Validates that a parsed object has all required fields for a LastCompletionRecord.
 * Returns true if the object passes basic structural validation.
 */
function isValidCompletionRecord(data: unknown): data is LastCompletionRecord {
  if (data === null || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  for (const field of REQUIRED_COMPLETION_FIELDS) {
    if (!(field in obj)) return false
  }

  // Additional type checks
  if (typeof obj.schemaVersion !== 'string') return false
  if (typeof obj.caseId !== 'string') return false
  if (typeof obj.caseVersion !== 'string') return false
  if (typeof obj.endingId !== 'string') return false
  if (typeof obj.completedAt !== 'string') return false

  return true
}

/**
 * Resolves the localStorage instance to use.
 * Uses globalThis.localStorage for test compatibility.
 */
function getStorage(): Storage {
  return globalThis.localStorage
}

/**
 * localStorage-backed implementation of SessionRepository.
 */
export class LocalStorageSessionRepository implements SessionRepository {
  async saveActiveSession(snapshot: ActiveSessionSnapshot): Promise<void> {
    try {
      const storage = getStorage()
      const serialized = JSON.stringify(snapshot)
      storage.setItem(sessionKey(snapshot.caseId), serialized)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new PersistenceError(
          'Armazenamento local cheio. Não foi possível salvar a sessão.',
          error,
        )
      }
      throw new PersistenceError('Falha ao salvar sessão no armazenamento local.', error)
    }
  }

  async loadActiveSession(caseId: string): Promise<ActiveSessionSnapshot | null> {
    try {
      const storage = getStorage()
      const raw = storage.getItem(sessionKey(caseId))

      if (raw === null) return null

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        // Corrupted JSON — discard
        storage.removeItem(sessionKey(caseId))
        return null
      }

      if (!isValidSessionSnapshot(parsed)) {
        // Missing required fields — corrupted — discard
        storage.removeItem(sessionKey(caseId))
        return null
      }

      return parsed
    } catch {
      // localStorage inaccessible
      return null
    }
  }

  async deleteActiveSession(caseId: string): Promise<void> {
    try {
      const storage = getStorage()
      storage.removeItem(sessionKey(caseId))
    } catch {
      // Silently ignore — if storage is inaccessible, nothing to delete
    }
  }

  async saveLastCompletion(record: LastCompletionRecord): Promise<void> {
    try {
      const storage = getStorage()
      const serialized = JSON.stringify(record)
      storage.setItem(completionKey(record.caseId), serialized)
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new PersistenceError(
          'Armazenamento local cheio. Não foi possível salvar o registro de conclusão.',
          error,
        )
      }
      throw new PersistenceError(
        'Falha ao salvar registro de conclusão no armazenamento local.',
        error,
      )
    }
  }

  async loadLastCompletion(caseId: string): Promise<LastCompletionRecord | null> {
    try {
      const storage = getStorage()
      const raw = storage.getItem(completionKey(caseId))

      if (raw === null) return null

      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        // Corrupted JSON — discard
        storage.removeItem(completionKey(caseId))
        return null
      }

      if (!isValidCompletionRecord(parsed)) {
        // Missing required fields — corrupted — discard
        storage.removeItem(completionKey(caseId))
        return null
      }

      return parsed
    } catch {
      // localStorage inaccessible
      return null
    }
  }

  async deleteLastCompletion(caseId: string): Promise<void> {
    try {
      const storage = getStorage()
      storage.removeItem(completionKey(caseId))
    } catch {
      // Silently ignore — if storage is inaccessible, nothing to delete
    }
  }

  isAvailable(): boolean {
    const testKey = '__cdp_storage_test__'
    try {
      const storage = getStorage()
      storage.setItem(testKey, 'test')
      const readBack = storage.getItem(testKey)
      storage.removeItem(testKey)
      return readBack === 'test'
    } catch {
      return false
    }
  }
}

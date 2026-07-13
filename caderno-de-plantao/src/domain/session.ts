/**
 * Domain Types — Session and Persistence
 * Design §4.8
 */

export interface ActiveSessionSnapshot {
  schemaVersion: string
  caseId: string
  caseVersion: string
  sessionId: string
  currentNodeId: string
  states: Record<string, number | boolean | string | null>
  confirmedChoices: ConfirmedChoice[]
  visitedNodes: string[]
  sessionStatus: 'in_progress' | 'completed'
  updatedAt: string // ISO 8601
}

export interface ConfirmedChoice {
  sequence: number
  nodeId: string
  choiceId: string
  confirmedAt: string // ISO 8601
}

export interface LastCompletionRecord {
  schemaVersion: string
  caseId: string
  caseVersion: string
  endingId: string
  completedAt: string // ISO 8601
}

export interface SessionRepository {
  saveActiveSession(snapshot: ActiveSessionSnapshot): Promise<void>
  loadActiveSession(caseId: string): Promise<ActiveSessionSnapshot | null>
  deleteActiveSession(caseId: string): Promise<void>
  saveLastCompletion(record: LastCompletionRecord): Promise<void>
  loadLastCompletion(caseId: string): Promise<LastCompletionRecord | null>
  deleteLastCompletion(caseId: string): Promise<void>
  isAvailable(): boolean
}

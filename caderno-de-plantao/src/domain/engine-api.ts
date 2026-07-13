/**
 * Domain Types — Narrative Engine Public API
 * Design §4.9
 */

import type { CaseFile } from './case-file'
import type { ActiveSessionSnapshot } from './session'
import type { EngineEvent, NodePresentation } from './engine-events'
import type { HistoryPresentation } from './history'

export type EngineEventListener = (event: EngineEvent) => void
export type Unsubscribe = () => void

export interface NarrativeEngine {
  startCase(caseFile: CaseFile): Promise<void>
  restoreSession(snapshot: ActiveSessionSnapshot, caseFile: CaseFile): Promise<void>
  confirmChoice(nodeId: string, choiceId: string): Promise<void>
  continueNarrative(nodeId: string): Promise<void>
  restartCase(): Promise<void>
  getHistoryPresentation(): HistoryPresentation
  getCurrentPresentation(): NodePresentation
  subscribe(listener: EngineEventListener): Unsubscribe
  dispose(): void
}

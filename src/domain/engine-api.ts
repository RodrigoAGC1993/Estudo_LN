/**
 * Domain Types — Narrative Engine Public API
 * Design §4.9
 *
 * Defines the abstract public contract for the NarrativeEngine.
 * All mutating commands are enqueued and processed one at a time.
 * Reading methods are synchronous and do not enter the queue.
 */

import type { CaseFile } from './case-file.ts';
import type { ActiveSessionSnapshot } from './session.ts';
import type { EngineEvent } from './engine-events.ts';
import type { HistoryPresentation } from './history.ts';
import type { NodePresentation } from './engine-events.ts';

// === Listener e Unsubscribe ===

export type EngineEventListener = (event: EngineEvent) => void;
export type Unsubscribe = () => void;

// === API Pública ===

export interface NarrativeEngine {
  startCase(caseFile: CaseFile): Promise<void>;
  restoreSession(snapshot: ActiveSessionSnapshot, caseFile: CaseFile): Promise<void>;
  confirmChoice(nodeId: string, choiceId: string): Promise<void>;
  continueNarrative(nodeId: string): Promise<void>;
  restartCase(): Promise<void>;
  getHistoryPresentation(): HistoryPresentation;
  getCurrentPresentation(): NodePresentation;
  subscribe(listener: EngineEventListener): Unsubscribe;
  dispose(): void;
}

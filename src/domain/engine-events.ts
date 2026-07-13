/**
 * Domain Types — Engine Events and Presentation DTOs
 * Design §4.10, §4.11
 *
 * Events emitted by the engine via subscribe(). Presentation types are safe
 * data transfer objects for the UI — no internal states exposed.
 */

import type { EndingName } from './endings.ts';
import type { NarrativePresentationMetadata } from './narrative-nodes.ts';

// === Apresentação (dados seguros para UI) ===

export interface NodePresentation {
  nodeId: string;
  prose: string;
  presentationMetadata: NarrativePresentationMetadata;
  options?: OptionPresentation[];
  nodeKind: 'decision' | 'progression' | 'ending' | 'debriefing';
}

export interface OptionPresentation {
  id: string;
  label: string;
  accessibleLabel?: string;
  isContinuation: boolean;
}

export interface BeatPresentation {
  prose: string;
}

export interface EndingPresentation {
  endingName: EndingName;
}

export interface DebriefingPresentation {
  sections: DebriefingSection[];
}

export interface DebriefingSection {
  title: string;
  entries: DebriefingEntryPresentation[];
}

export interface DebriefingEntryPresentation {
  content: string;
  analysisCategory?: string;
}

// === Content Error (para evento CONTENT_ERROR) ===

export interface ContentError {
  code: string;
  message: string;
  location?: string;
}

// === Engine Events (discriminated union por 'type') ===

export type EngineEvent =
  | { type: 'CASE_STARTED'; presentation: NodePresentation }
  | { type: 'NODE_PRESENTED'; presentation: NodePresentation }
  | { type: 'CHOICE_CONFIRMATION_STARTED'; nodeId: string; choiceId: string }
  | { type: 'CHOICE_CONFIRMED'; presentation: NodePresentation; beat?: BeatPresentation }
  | { type: 'CONTINUATION_COMPLETED'; presentation?: NodePresentation; beat?: BeatPresentation }
  | { type: 'SESSION_RESTORED'; presentation: NodePresentation }
  | { type: 'ENDING_RESOLVED'; ending: EndingPresentation }
  | { type: 'DEBRIEFING_PRESENTED'; debriefing: DebriefingPresentation }
  | { type: 'PERSISTENCE_WARNING'; message: string }
  | { type: 'CONTENT_ERROR'; error: ContentError }
  | { type: 'SESSION_INVALIDATED'; reason: string };

// === Estado Técnico Interno da Engine (§4.11) ===

export interface EngineInternalState {
  persistenceStatus: 'available' | 'degraded';
  commandQueueLength: number;
  isProcessing: boolean;
}
